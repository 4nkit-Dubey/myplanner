import React, { useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import FocusTimer, { primeTimerAudio } from "../FocusTimer.jsx";
import {
  saveProgress,
  preparePlanImport,
  commitPlanImport,
  readLibrary,
  writeRegistry,
} from "../appStore.js";
import { setPlanActive } from "../registry.js";
import { recordMeasurement, setOccurrence } from "../progress.js";
import planSchema from "../../schema/plan.schema.json" with { type: "json" };
import {
  Header,
  Icon,
  ImportPreviewDialog,
  MeasureDialog,
  NAV,
  Sidebar,
  Toast,
} from "../components/PlannerUI.jsx";
import { PlannerContext } from "../context/PlannerContext.jsx";

export default function AppLayout() {
  const [library, setLibrary] = useState(() => readLibrary());
  const { registry } = library;
  const location = useLocation();
  const navigate = useNavigate();
  const page = location.pathname === "/" ? "overview" : location.pathname.slice(1);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [toast, setToast] = useState(null);
  const [measureTarget, setMeasureTarget] = useState(null);
  const [measureValue, setMeasureValue] = useState("");
  const [pendingImport, setPendingImport] = useState(null);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [timerSession, setTimerSession] = useState(null);
  const fileInput = useRef(null);
  const selectedPlan =
    registry.plans.find((plan) => plan.plan.id === registry.selectedPlanId) ||
    null;
  const envelope = selectedPlan
    ? library.envelopes.get(selectedPlan.plan.id)
    : null;
  const progress = envelope?.progress || null;

  function updateLibrary() {
    setLibrary(readLibrary());
  }
  function showToast(message, type = "success") {
    setToast({ message, type });
  }
  function startTaskTimer(item) {
    primeTimerAudio();
    setTimerSession({
      taskName: item.task.title,
      totalMinutes: Math.max(1, Math.round(item.durationMinutes)),
    });
  }
  function openCreate() {
    changePage("create");
  }
  function selectPlan(id) {
    const next = { ...registry, selectedPlanId: id };
    try {
      writeRegistry(next);
      setLibrary(readLibrary());
    } catch {
      showToast("Could not save your selected plan in this browser.", "error");
    }
  }
  function togglePlanActive(id, active) {
    try {
      const next = setPlanActive(registry, id, active);
      writeRegistry(next);
      setLibrary(readLibrary());
    } catch (error) {
      showToast(error.message || "Could not update this plan.", "error");
    }
  }
  function changePage(id) {
    navigate(id === "overview" ? "/" : `/${id}`);
    setPlanMenuOpen(false);
  }
  function shiftPeriod(direction) {
    setViewDate((current) => {
      const next = new Date(current);
      if (page === "monthly") next.setMonth(next.getMonth() + direction);
      else
        next.setDate(next.getDate() + direction * (page === "daily" ? 1 : 7));
      return next;
    });
  }
  function toggleOccurrence(item) {
    if (!selectedPlan || !progress) return;
    try {
      const nextProgress = setOccurrence(
        progress,
        item.occurrenceId,
        item.status === "completed"
          ? { status: "pending", completedAt: undefined }
          : { status: "completed", completedAt: new Date().toISOString() },
      );
      saveProgress(selectedPlan, nextProgress);
      updateLibrary();
    } catch (error) {
      showToast(error.message || "Progress could not be saved.", "error");
    }
  }
  function openMeasurement(item) {
    setMeasureTarget(item);
    setMeasureValue("");
  }
  function saveMeasurement(event) {
    event.preventDefault();
    if (!selectedPlan || !progress || measureValue.trim() === "") return;
    const value = Number(measureValue);
    if (!Number.isFinite(value) || value < 0) {
      showToast("Enter a valid non-negative amount.", "error");
      return;
    }
    try {
      const nextProgress = recordMeasurement(
        progress,
        measureTarget.task.id,
        value,
      );
      saveProgress(selectedPlan, nextProgress);
      setLibrary(readLibrary());
      setMeasureTarget(null);
      setMeasureValue("");
      showToast("Measurement saved to your progress.");
    } catch (error) {
      showToast(error.message || "Measurement could not be saved.", "error");
    }
  }
  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = preparePlanImport(text, registry);
      if (result.ok) setPendingImport(result);
      else if (result.error?.code === "PLAN_INVALID") {
        const first = result.error.preview?.errors?.[0];
        showToast(
          first?.message ||
            "This plan needs a small fix before it can be imported.",
          "error",
        );
      } else
        showToast(
          result.error?.message || "That file could not be imported.",
          "error",
        );
    } catch (error) {
      showToast(error.message || "That file could not be read.", "error");
    } finally {
      event.target.value = "";
    }
  }
  function confirmImport(replace) {
    if (!pendingImport) return;
    const result = commitPlanImport(pendingImport.plan, registry, { replace });
    if (result.ok) {
      setLibrary(readLibrary());
      navigate("/");
      setViewDate(new Date());
      setPendingImport(null);
      showToast(
        result.replaced
          ? "Plan updated. Your existing progress was preserved."
          : "Plan imported and ready to explore.",
      );
    } else if (result.error?.code === "PLAN_INVALID") {
      const first = result.error.preview?.errors?.[0];
      showToast(
        first?.message ||
          "This plan needs a small fix before it can be imported.",
        "error",
      );
      setPendingImport(null);
    } else
      showToast(
        result.error?.message || "The plan could not be saved.",
        "error",
      );
  }
  function downloadSchema() {
    const blob = new Blob([`${JSON.stringify(planSchema, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "myplanner-plan-schema-v1.0.0.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const plannerContext = {
    plan: selectedPlan,
    progress,
    date: viewDate,
    setDate: setViewDate,
    setPage: changePage,
    onToggle: toggleOccurrence,
    onMeasure: openMeasurement,
    onStartTimer: startTaskTimer,
    onCreate: openCreate,
    onImport: () => fileInput.current?.click(),
    onCreateFile: downloadSchema,
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />
      <div className="desktop-sidebar">
        <Sidebar
          page={page}
          setPage={changePage}
          onCreate={openCreate}
          planCount={registry.plans.length}
        />
      </div>
      <main className="main-panel">
        <Header
          page={page}
          plan={selectedPlan}
          registry={registry}
          onSelectPlan={selectPlan}
          onToggleActive={togglePlanActive}
          onImport={() => fileInput.current?.click()}
          date={viewDate}
          onShift={shiftPeriod}
          onToday={() => setViewDate(new Date())}
          menuOpen={planMenuOpen}
          setMenuOpen={setPlanMenuOpen}
        />
        <PlannerContext.Provider value={plannerContext}>
          <Outlet />
        </PlannerContext.Provider>
        <footer className="app-footer">
          <span>MYPLANNER · A LITTLE MORE INTENTIONAL</span>
          <span>
            Private by design <i />
          </span>
        </footer>
      </main>
      <nav className="mobile-tabbar glass-panel" aria-label="Mobile navigation">
        {[...NAV, { id: "create", label: "Create", icon: "add" }].map(
          (item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => changePage(item.id)}
              aria-current={page === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          ),
        )}
      </nav>
      <input
        ref={fileInput}
        id="plan-file-input"
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
      />
      <ImportPreviewDialog
        pendingImport={pendingImport}
        onClose={() => setPendingImport(null)}
        onCommit={confirmImport}
      />
      <MeasureDialog
        item={measureTarget}
        value={measureValue}
        setValue={setMeasureValue}
        onClose={() => setMeasureTarget(null)}
        onSubmit={saveMeasurement}
      />
      {timerSession && (
        <FocusTimer
          key={`${timerSession.taskName}-${timerSession.totalMinutes}`}
          {...timerSession}
          onClose={() => setTimerSession(null)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
