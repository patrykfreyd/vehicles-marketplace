/**
 * react-native@0.87 has a real, reproducible typings inconsistency: some
 * components (`Pressable`, `TextInput`, ...) declare their `style` prop via
 * the package's *exported* `ViewStyle`/`TextStyle` aliases, while others
 * (`View`, `Text`) resolve to a separate, newer generated internal type.
 * The two disagree on a handful of fields (e.g. the exported `ViewStyle`'s
 * `position` allows `"fixed"`/`"sticky"`, which the internal type doesn't),
 * so TypeScript sometimes refuses to structurally match a style object
 * against a component's `style` prop — reproduced with an object as
 * trivial as `{ flexDirection: 'row' }` against `<Pressable>`, while the
 * exact same object is accepted by `<View>` outright.
 *
 * This is confirmed to be an upstream types defect, not a real type error
 * (the same values render correctly at runtime — `style` is just a plain
 * object RN reads at render time, untyped by the platform). `rnStyle`
 * isolates the one narrow, documented escape hatch every component in this
 * package uses for it, rather than scattering unexplained `as any` calls.
 */
export function rnStyle(style: unknown): never {
  return style as never;
}
