export type CvItemType = "project" | "achievement" | "activity" | "experience" | "education" | "skill";
export type CvPick = { itemType: CvItemType; itemId: number; sortOrder: number };
export type CvOrderable = { id: number; sortOrder: number; showInCv: boolean };

export function resolveCvSection<T extends CvOrderable>(all: T[], type: CvItemType, picks: CvPick[]): T[] {
  const mine = picks.filter((p) => p.itemType === type);
  if (mine.length === 0) {
    return all.filter((i) => i.showInCv).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const byId = new Map(all.map((i) => [i.id, i]));
  return mine
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => byId.get(p.itemId))
    .filter((i): i is T => i !== undefined);
}
