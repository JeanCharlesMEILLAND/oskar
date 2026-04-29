import { Turtle } from "./Turtle";

type Props = { className?: string; withLettuce?: boolean };

export function CuteTurtle({ className = "w-48 md:w-64", withLettuce = true }: Props) {
  return (
    <Turtle
      idKey="hero"
      className={className}
      body="#4ade80"
      shell="#22c55e"
      accent="#16a34a"
      pattern="hex"
      expression="happy"
      withLettuce={withLettuce}
    />
  );
}
