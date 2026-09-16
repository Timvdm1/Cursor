import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the default greeting", () => {
    render(<App />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("updates the greeting as the user types", () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/type your name/i), {
      target: { value: "Tim" },
    });
    expect(screen.getByText("Hello, Tim!")).toBeInTheDocument();
  });

  it("increments the counter on click", () => {
    render(<App />);
    const button = screen.getByRole("button", { name: /clicked/i });
    fireEvent.click(button);
    expect(button).toHaveTextContent("Clicked 1 time");
  });
});
