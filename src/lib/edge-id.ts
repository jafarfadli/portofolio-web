/** A wire's id in an article diagram: "from>to". Kept apart from the zod schema so client code can use it cheaply. */
export function edgeId(e: { from: string; to: string }): string {
  return `${e.from}>${e.to}`;
}
