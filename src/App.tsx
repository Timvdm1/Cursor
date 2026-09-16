import { useState } from "react";
import { greet } from "./greeting";

const stack = [
  { name: "Vite", detail: "Dev server & bundler" },
  { name: "React 18", detail: "UI library" },
  { name: "TypeScript", detail: "Type safety" },
  { name: "Vitest", detail: "Unit testing" },
];

export default function App() {
  const [name, setName] = useState("");
  const [count, setCount] = useState(0);

  return (
    <main className="page">
      <section className="card">
        <span className="badge">Cursor Cloud Agent · starter</span>
        <h1>
          Your environment is <span className="accent">working</span> 🎉
        </h1>
        <p className="lede">
          This tiny Vite + React + TypeScript app was scaffolded to prove the
          development environment installs, builds and runs end to end.
        </p>

        <div className="demo">
          <label htmlFor="name">Try it — type your name:</label>
          <input
            id="name"
            value={name}
            placeholder="e.g. Tim"
            onChange={(event) => setName(event.target.value)}
          />
          <output className="greeting" aria-live="polite">
            {greet(name)}
          </output>
        </div>

        <button className="counter" onClick={() => setCount((c) => c + 1)}>
          Clicked {count} {count === 1 ? "time" : "times"}
        </button>

        <ul className="stack">
          {stack.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
