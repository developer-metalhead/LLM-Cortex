import fs from "fs/promises";
import path from "path";
import { SoulProfile } from "./soul.js";

export function validateProfile(raw: any): SoulProfile {
  const profile: SoulProfile = {};

  if (Array.isArray(raw.disallowedLibraries)) {
    profile.disallowedLibraries = raw.disallowedLibraries.filter(
      (lib: any) => typeof lib === "string" && lib.trim().length > 0,
    );
  }

  if (typeof raw.riskTolerance === "number") {
    profile.riskTolerance = Math.max(0, Math.min(1, raw.riskTolerance));
  }

  if (typeof raw.creativityBias === "number") {
    profile.creativityBias = Math.max(0, Math.min(1, raw.creativityBias));
  }

  if (typeof raw.precisionBias === "number") {
    profile.precisionBias = Math.max(0, Math.min(1, raw.precisionBias));
  }

  if (["off", "lite", "ultra"].includes(raw.brevityStyle)) {
    profile.brevityStyle = raw.brevityStyle;
  }

  return profile;
}

const PROFILE_FILE = "user_profile.json";

export class ProfileManager {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  get profilePath(): string {
    return path.join(this.projectRoot, ".knowledge", PROFILE_FILE);
  }

  async load(): Promise<SoulProfile> {
    try {
      const raw = await fs.readFile(this.profilePath, "utf8");
      const parsed = JSON.parse(raw);
      return validateProfile(parsed);
    } catch {
      return {};
    }
  }

  async save(profile: SoulProfile): Promise<void> {
    const profileDir = path.dirname(this.profilePath);
    await fs.mkdir(profileDir, { recursive: true });
    const validated = validateProfile(profile);
    await fs.writeFile(this.profilePath, JSON.stringify(validated, null, 2), "utf8");
  }

  async exportProfile(outputPath?: string): Promise<string> {
    const profile = await this.load();
    const targetPath = outputPath || path.join(process.cwd(), "cortex_profile_export.json");
    await fs.writeFile(targetPath, JSON.stringify(profile, null, 2), "utf8");
    return targetPath;
  }

  async importProfile(sourcePath: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const raw = await fs.readFile(sourcePath, "utf8");
      const parsed = JSON.parse(raw);
      const validated = validateProfile(parsed);
      await this.save(validated);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: err.message };
    }
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.profilePath);
      return true;
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    await this.save({});
  }
}
