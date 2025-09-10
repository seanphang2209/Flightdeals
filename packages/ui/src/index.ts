export const tokens = {
  radius: { sm: 10, md: 14, lg: 20 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string };
export function Button(props: ButtonProps) {
  const { label, className = '', ...rest } = props;
  return (
    <button className={`rounded border px-3 py-1 ${className}`} {...rest}>
      {label}
    </button>
  );
} 