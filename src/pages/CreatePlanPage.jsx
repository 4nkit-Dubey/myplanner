import React, { useRef, useState } from "react";
import { createMasterPrompt } from "../masterPrompt.js";
import { usePlanner } from "../context/PlannerContext.jsx";
import { Icon, IconButton } from "../components/PlannerUI.jsx";

const PROMPT = createMasterPrompt();

function CreatePlan({ onImport, onCreateFile }) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const promptRef = useRef(null);
  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setShowPrompt(true);
      window.setTimeout(() => promptRef.current?.select(), 0);
    }
  }
  return (
    <div className="page-content create-content">
      <section className="create-hero glass-panel">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <span className="hero-icon">
            <Icon name="spark" size={21} />
          </span>
          <div className="eyebrow">FROM IDEA TO ACTION</div>
          <h2>A plan that feels like yours.</h2>
          <p>
            Use an AI assistant to shape a realistic plan, then bring it here to
            make progress at your own pace.
          </p>
        </div>
        <div className="hero-steps">
          {["Imagine", "Shape", "Begin"].map((step, index) => (
            <div key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="create-step-grid">
        <article className="glass-card create-step">
          <div className="step-top">
            <span className="step-number">01</span>
            <span className="step-icon">
              <Icon name="copy" size={18} />
            </span>
          </div>
          <div className="eyebrow">START WITH CLARITY</div>
          <h3>Copy your planning prompt</h3>
          <p>
            Take the MyPlanner prompt to an AI assistant to talk through your
            goals and shape a plan.
          </p>
          <button className="button button-outline" onClick={copyPrompt}>
            <Icon name={copied ? "check" : "copy"} size={16} />
            {copied ? "Copied to clipboard" : "Copy MyPlanner prompt"}
          </button>
        </article>
        <article className="glass-card create-step">
          <div className="step-top">
            <span className="step-number">02</span>
            <span className="step-icon">
              <Icon name="spark" size={18} />
            </span>
          </div>
          <div className="eyebrow">MAKE IT MEANINGFUL</div>
          <h3>Shape the plan with AI</h3>
          <p>
            Discuss the plan with your preferred AI assistant. Review its
            summary and approve before it returns JSON.
          </p>
          <div className="step-hint">
            <span className="live-dot" /> MyPlanner won’t generate plans on its
            own.
          </div>
        </article>
        <article className="glass-card create-step">
          <div className="step-top">
            <span className="step-number">03</span>
            <span className="step-icon">
              <Icon name="download" size={18} />
            </span>
          </div>
          <div className="eyebrow">KEEP A PORTABLE COPY</div>
          <h3>Download the plan file</h3>
          <p>
            Ask the assistant for the complete JSON file. Save it somewhere you
            can find it again.
          </p>
          <div className="file-chip">
            <span className="file-chip-icon">{`{ }`}</span>
            <div>
              <strong>your-plan.json</strong>
              <small>One plan · portable JSON</small>
            </div>
            <Icon name="check" size={16} />
          </div>
        </article>
        <article className="glass-card create-step import-step">
          <div className="step-top">
            <span className="step-number">04</span>
            <span className="step-icon">
              <Icon name="upload" size={18} />
            </span>
          </div>
          <div className="eyebrow">BRING IT INTO YOUR SPACE</div>
          <h3>Import and get moving</h3>
          <p>
            MyPlanner checks the file against its schema and planning rules
            before saving it in this browser.
          </p>
          <button className="button button-primary" onClick={onImport}>
            <Icon name="upload" size={16} />
            Choose a JSON file
          </button>
          <span className="button-caption">
            Plan content stays read-only; progress stays yours.
          </span>
        </article>
      </section>
      {showPrompt && (
        <section className="glass-card prompt-fallback">
          <div className="detail-heading">
            <div>
              <div className="eyebrow">COPY THE PROMPT</div>
              <h3>Select and copy</h3>
            </div>
            <IconButton
              label="Close prompt"
              onClick={() => setShowPrompt(false)}
            >
              <Icon name="close" />
            </IconButton>
          </div>
          <textarea
            ref={promptRef}
            value={PROMPT}
            readOnly
            aria-label="MyPlanner AI prompt"
          />
          <button
            className="button button-outline"
            onClick={() => {
              promptRef.current?.select();
              document.execCommand("copy");
              setCopied(true);
            }}
          >
            Select prompt text
          </button>
        </section>
      )}
      <section className="create-bottom-note glass-card">
        <div className="note-icon">
          <Icon name="target" size={18} />
        </div>
        <div>
          <strong>Built around your verified MyPlanner foundation</strong>
          <p>
            Imported plans are validated against schema v1.0.0. Your completion
            and measurements are stored separately from the plan data.
          </p>
        </div>
        <button className="text-button" onClick={onCreateFile}>
          Download schema <Icon name="download" size={15} />
        </button>
      </section>
    </div>
  );
}

export default function CreatePlanPage() {
  const { onImport, onCreateFile } = usePlanner();
  return <CreatePlan {...{ onImport, onCreateFile }} />;
}
