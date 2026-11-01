import { cn } from "../../lib/cn.js";
import { HEX_PATTERN } from "../../lib/color.js";

const SWATCHES = ["#2b4bd3", "#1f6f5b", "#5f7147", "#c8482b", "#7a3b69", "#b7791f", "#1c1b18"];

const BrandColorPicker = ({ value, onChange, error }) => {
  const current = value.toLowerCase();

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-ink">Brand colour</legend>
      <div className="flex flex-wrap items-center gap-2.5">
        {SWATCHES.map((color) => {
          const selected = color === current;

          return (
            <button
              key={color}
              type="button"
              aria-label={`Use ${color}`}
              aria-pressed={selected}
              onClick={() => {
                onChange(color);
              }}
              style={{ backgroundColor: color }}
              className={cn(
                "size-8 rounded-full ring-offset-2 ring-offset-surface transition",
                selected ? "ring-2 ring-ink" : "hover:scale-110",
              )}
            />
          );
        })}
        <label className="ml-1 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="color"
            aria-label="Pick a custom colour"
            value={HEX_PATTERN.test(value) ? current : "#2b4bd3"}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            className="size-8 cursor-pointer rounded-full border border-line bg-transparent p-0.5"
          />
          Custom
        </label>
      </div>
      {error && <p className="mt-1.5 text-sm text-clay-600">{error}</p>}
    </fieldset>
  );
};

export default BrandColorPicker;
