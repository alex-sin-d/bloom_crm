export interface SourceProfile {
  email: string;
  id: string;
}

export interface TargetProfile {
  email: string;
  id: string;
}

export interface ExplicitProfileRemap {
  sourceKey: string;
  targetEmail: string;
}

export interface ProfileRemapEntry {
  sourceEmail: string;
  sourceId: string;
  targetEmail: string;
  targetId: string;
  via: "explicit_remap" | "same_id";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseProfileRemaps(raw: string | undefined): ExplicitProfileRemap[] {
  if (raw === undefined || raw.trim() === "") return [];

  const entries: ExplicitProfileRemap[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "") continue;

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      throw new Error(
        `Invalid PROFILE_REMAPS entry "${trimmed}". Expected "source-profile-id-or-email:target-production-email".`
      );
    }

    const sourceKey = trimmed.slice(0, separator).trim();
    const targetEmail = trimmed.slice(separator + 1).trim().toLowerCase();
    if (!sourceKey) {
      throw new Error(`Invalid PROFILE_REMAPS entry "${trimmed}": missing source profile id or email.`);
    }
    if (!EMAIL_PATTERN.test(targetEmail)) {
      throw new Error(`Invalid PROFILE_REMAPS entry "${trimmed}": target must be a production profile email.`);
    }
    if (!UUID_PATTERN.test(sourceKey) && !EMAIL_PATTERN.test(sourceKey.toLowerCase())) {
      throw new Error(
        `Invalid PROFILE_REMAPS entry "${trimmed}": source must be a profile UUID or email address.`
      );
    }

    entries.push({
      sourceKey: UUID_PATTERN.test(sourceKey) ? sourceKey.toLowerCase() : sourceKey.toLowerCase(),
      targetEmail
    });
  }

  return entries;
}

export function buildProfileMap(
  sourceProfiles: SourceProfile[],
  targetProfiles: TargetProfile[],
  explicitRemaps: ExplicitProfileRemap[]
): { entries: ProfileRemapEntry[]; map: Map<string, string> } {
  const sourceById = new Map(sourceProfiles.map((profile) => [profile.id.toLowerCase(), profile]));
  const sourceByEmail = new Map(sourceProfiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const targetByEmail = new Map(targetProfiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const targetIds = new Set(targetProfiles.map((profile) => profile.id.toLowerCase()));

  const map = new Map<string, string>();
  const entries: ProfileRemapEntry[] = [];
  const seenSourceIds = new Set<string>();

  function addEntry(profile: SourceProfile, target: TargetProfile, via: ProfileRemapEntry["via"]): void {
    const sourceId = profile.id.toLowerCase();
    if (seenSourceIds.has(sourceId)) {
      const existing = entries.find((entry) => entry.sourceId.toLowerCase() === sourceId);
      if (existing && existing.targetId !== target.id) {
        throw new Error(
          `Conflicting profile remap for source profile ${profile.id} (${profile.email}): ` +
            `${existing.targetEmail} vs ${target.email}.`
        );
      }
      return;
    }

    map.set(profile.id, target.id);
    entries.push({
      sourceEmail: profile.email,
      sourceId: profile.id,
      targetEmail: target.email,
      targetId: target.id,
      via
    });
    seenSourceIds.add(sourceId);
  }

  for (const profile of sourceProfiles) {
    if (targetIds.has(profile.id.toLowerCase())) {
      const target = targetProfiles.find((entry) => entry.id.toLowerCase() === profile.id.toLowerCase())!;
      addEntry(profile, target, "same_id");
    }
  }

  for (const remap of explicitRemaps) {
    const sourceProfile = UUID_PATTERN.test(remap.sourceKey)
      ? sourceById.get(remap.sourceKey)
      : sourceByEmail.get(remap.sourceKey);
    if (!sourceProfile) {
      throw new Error(
        `PROFILE_REMAPS references unknown source profile "${remap.sourceKey}". ` +
          "Use a source profile id or email that exists locally."
      );
    }

    const targetProfile = targetByEmail.get(remap.targetEmail);
    if (!targetProfile) {
      throw new Error(
        `PROFILE_REMAPS maps "${remap.sourceKey}" to unknown target email "${remap.targetEmail}". ` +
          "Create that production user first (see scripts/admin)."
      );
    }

    addEntry(sourceProfile, targetProfile, "explicit_remap");
  }

  entries.sort((left, right) => left.sourceEmail.localeCompare(right.sourceEmail));
  return { entries, map };
}

export function formatUnresolvedProfileError(
  unresolved: Array<{ column: string; table: string; value: unknown }>,
  sourceProfiles: SourceProfile[]
): string {
  const sourceById = new Map(sourceProfiles.map((profile) => [profile.id.toLowerCase(), profile]));
  const preview = unresolved
    .slice(0, 20)
    .map((entry) => {
      const profile = sourceById.get(String(entry.value).toLowerCase());
      const label = profile ? `${profile.email} (${profile.id})` : String(entry.value);
      return `  ${entry.table}.${entry.column} = ${label}`;
    })
    .join("\n");

  return (
    `${unresolved.length} row(s) reference a source profile this script could not remap ` +
    `(showing first ${Math.min(20, unresolved.length)}):\n${preview}\n` +
    "Add an explicit entry to PROFILE_REMAPS for each remaining local profile, or add the profile to " +
    "EXCLUDED_SOURCE_PROFILE_IDS when its workflow rows should be omitted from production."
  );
}
