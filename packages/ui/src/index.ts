export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string };
export function Button(props: ButtonProps) {
  const { label, className = '', ...rest } = props;
  return (
    <button className={`rounded border px-3 py-1 ${className}`} {...rest}>
      {label}
    </button>
  );
} 