import { HEX_PATTERN, readableTextColor } from "../../lib/color.js";

const initialsOf = (name) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => {
      return part[0].toUpperCase();
    })
    .join("");
};

// Shows how the workspace will look, so the colour choice isn't a guess.
const WorkspacePreview = ({ name, color }) => {
  const background = HEX_PATTERN.test(color) ? color : "#2b4bd3";
  const label = name.trim() || "Your workspace";

  return (
    <div className="flex items-center gap-3 rounded-control bg-sunken/60 p-4">
      <span
        style={{ backgroundColor: background, color: readableTextColor(background) }}
        className="grid size-10 shrink-0 place-items-center rounded-lg text-sm font-semibold"
      >
        {initialsOf(label)}
      </span>
      <span className="min-w-0 truncate font-medium text-ink">{label}</span>
    </div>
  );
};

export default WorkspacePreview;
