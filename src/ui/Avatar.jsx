import { initialsOf } from "../lib/student";

const TONES = {
  patient: "bg-gradient-to-br from-amber-300 to-orange-400 text-ink",
  examiner: "bg-gradient-to-br from-sky to-brand text-white",
  student: "bg-ink text-white",
};

const Avatar = ({ name, role = "patient", size = "h-9 w-9 text-sm", ring = false, className = "" }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${TONES[role]} ${size} ${
      ring ? "ring-2 ring-white" : ""
    } ${className}`}
    aria-hidden
  >
    {initialsOf(name)}
  </span>
);

export default Avatar;
