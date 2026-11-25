/** Keyboard key hint. `keys` renders a combination ("Shift" + "R"). */
export function Kbd({
  children,
  keys,
  className,
}: {
  children?: string;
  keys?: string[];
  className?: string | undefined;
}) {
  const list = keys ?? (children ? [children] : []);
  return (
    <span className={className ? `kbd-group ${className}` : 'kbd-group'}>
      {list.map((k, i) => (
        <span key={k} className="kbd-group__item">
          {i > 0 && (
            <span className="kbd-plus" aria-hidden="true">
              +
            </span>
          )}
          <kbd className="kbd">{k}</kbd>
        </span>
      ))}
    </span>
  );
}
