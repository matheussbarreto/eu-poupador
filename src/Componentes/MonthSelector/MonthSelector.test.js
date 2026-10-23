import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import MonthSelector from "./index";

global.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

beforeEach(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date(2026, 2, 31, 12));
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.useRealTimers();
});

test("volta do dia 31 para fevereiro e avisa a página uma vez, inclusive em StrictMode", async () => {
    const onDateChange = jest.fn();
    await act(async () => root.render(<StrictMode><MonthSelector onDateChange={onDateChange} /></StrictMode>));
    expect(container.textContent).toContain("Março de 2026");
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(container.textContent).toContain("Fevereiro de 2026");
    expect(onDateChange).toHaveBeenCalledTimes(1);
    expect(onDateChange).toHaveBeenLastCalledWith(new Date(2026, 1, 1));
    await act(async () => jest.advanceTimersByTime(200));
    await act(async () => container.querySelector('[aria-label="Próximo mês"]').click());
    expect(onDateChange).toHaveBeenCalledTimes(2);
    expect(onDateChange).toHaveBeenLastCalledWith(new Date(2026, 2, 1));
    expect(container.textContent).toContain("Março de 2026");
});

test("bloqueia mês futuro e cliques durante a animação", async () => {
    const onDateChange = jest.fn();
    await act(async () => root.render(<MonthSelector onDateChange={onDateChange} />));
    const anterior = container.querySelector('[aria-label="Mês anterior"]');
    const proximo = container.querySelector('[aria-label="Próximo mês"]');
    expect(proximo.disabled).toBe(true);
    await act(async () => proximo.click());
    expect(onDateChange).not.toHaveBeenCalled();
    await act(async () => anterior.click());
    expect(anterior.disabled).toBe(true);
    await act(async () => anterior.click());
    expect(onDateChange).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(200));
    expect(anterior.disabled).toBe(false);
});

test("navega entre janeiro e dezembro sem exigir callback, preservando os demais usos", async () => {
    jest.setSystemTime(new Date(2026, 0, 31, 12));
    await act(async () => root.render(<MonthSelector />));
    await act(async () => container.querySelector('[aria-label="Mês anterior"]').click());
    expect(container.textContent).toContain("Dezembro de 2025");
    await act(async () => jest.advanceTimersByTime(200));
    await act(async () => container.querySelector('[aria-label="Próximo mês"]').click());
    expect(container.textContent).toContain("Janeiro de 2026");
});
