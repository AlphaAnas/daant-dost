import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SceneProvider, createSceneStore } from "../../scene/sceneStore";
import AgeTimeline, { countTeeth, formatAge } from "./AgeTimeline";

describe("AgeTimeline", () => {
  test("formats ages and counts the teeth in the mouth", () => {
    expect(formatAge(7.5)).toBe("7.5 years");
    expect(formatAge(1)).toBe("1 year");
    expect(countTeeth(4)).toEqual({ total: 20, baby: 20, adult: 0, erupting: [] });
    expect(countTeeth(7.5).erupting).toEqual(["11", "21", "32", "42"]);
  });

  test("switches the mouth between adult and an age", () => {
    const store = createSceneStore();
    render(
      <SceneProvider store={store}>
        <AgeTimeline />
      </SceneProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Age timeline" }));
    expect(store.getState().age).toBe(7);
    expect(screen.getByText("7 years")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Age in years"), { target: { value: "3" } });
    expect(store.getState().age).toBe(3);
    expect(screen.getByText("20 teeth · 20 baby · 0 adult · erupting: 55, 65")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adult" }));
    expect(store.getState().age).toBe(null);
  });
});
