const API_BASE = "http://127.0.0.1:2200";

const form = document.getElementById("predictForm");
const panel = document.getElementById("panel");
const resultView = document.getElementById("resultView");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const tryAgainBtn = document.getElementById("tryAgainBtn");

// ---- Live slider value labels ----
const sliderIds = [
  "avg_daily_usage_hours",
  "study_hours",
  "physical_activity_hours",
  "sleep_hours_per_night",
  //"stress_level",
];

sliderIds.forEach((id) => {
  const input = document.getElementById(id);
  const out = document.getElementById(id + "_val");
  const render = () => {
    const isInt = id === "stress_level";
    out.textContent = isInt
      ? Math.round(parseFloat(input.value))
      : parseFloat(input.value).toFixed(1);
  };
  input.addEventListener("input", render);
  render();
});

// ---- Helpers ----
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.classList.toggle("loading", isLoading);
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearFormError() {
  formError.hidden = true;
  formError.textContent = "";
}

function readablyLabelField(loc) {
  // loc is like ["body", "age"] from FastAPI validation errors
  const field = loc[loc.length - 1];
  return String(field).replaceAll("_", " ");
}

function buildPayload() {
  const fd = new FormData(form);
  return {
    age: parseInt(fd.get("age"), 10),
    gender: fd.get("gender"),
    country: fd.get("country").trim(),
    academic_level: fd.get("academic_level"),
    most_used_platform: fd.get("most_used_platform"),
    purpose_of_use: fd.get("purpose_of_use"),
    avg_daily_usage_hours: parseFloat(fd.get("avg_daily_usage_hours")),
    daily_unlocks: parseInt(fd.get("daily_unlocks"), 10),
    study_hours: parseFloat(fd.get("study_hours")),
    physical_activity_hours: parseFloat(fd.get("physical_activity_hours")),
    sleep_hours_per_night: parseFloat(fd.get("sleep_hours_per_night")),
    stress_level:fd.get("stress_level"),
  };
}

// ---- Result rendering ----
const GAUGE_CIRCUMFERENCE = 251.2; // half-circumference of the arc in the SVG
// The model's score generally falls in a 0-10 range for this dataset;
// used only to position the gauge needle, not to judge the number itself.
const GAUGE_MIN = 0;
const GAUGE_MAX = 10;

function bandFor(score) {
  if (score <= 3) {
    return {
      label: "Looking steady",
      copy: "Your inputs suggest a relatively low predicted impact on mental wellbeing. Keep an eye on the habits that are working for you.",
      color: "#4F6F52",
    };
  }
  if (score <= 6) {
    return {
      label: "Worth a closer look",
      copy: "There's a moderate signal here. Small shifts in sleep, screen time, or stress management could make a real difference.",
      color: "#B08A3E",
    };
  }
  return {
    label: "Take this seriously",
    copy: "The model is flagging a stronger signal. Consider talking to someone you trust, or a counselor, about how you've been feeling.",
    color: "#B9614A",
  };
}

function renderResult(score) {
  const numeric = Number(score);
  const clamped = Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, numeric));
  const fraction = (clamped - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN);

  const gaugeFill = document.getElementById("gaugeFill");
  const scoreValue = document.getElementById("scoreValue");
  const resultLabel = document.getElementById("resultLabel");
  const resultCopy = document.getElementById("resultCopy");

  const band = bandFor(clamped);

  scoreValue.textContent = numeric.toFixed(1);
  resultLabel.textContent = band.label;
  resultLabel.style.color = band.color;
  resultCopy.textContent = band.copy;

  gaugeFill.style.stroke = band.color;
  // Reset then animate on next frame so the transition actually plays
  gaugeFill.style.transition = "none";
  gaugeFill.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  requestAnimationFrame(() => {
    gaugeFill.style.transition = "";
    gaugeFill.style.strokeDashoffset = String(
      GAUGE_CIRCUMFERENCE * (1 - fraction)
    );
  });

  form.hidden = true;
  resultView.hidden = false;
}

// ---- Submit handler ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFormError();

  if (!form.reportValidity()) return;

  const payload = buildPayload();
  setLoading(true);

  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.status === 422) {
      const errorBody = await response.json();
      const details = Array.isArray(errorBody.detail) ? errorBody.detail : [];
      if (details.length) {
        const messages = details
          .map((d) => `${readablyLabelField(d.loc)} — ${d.msg}`)
          .join("; ");
        showFormError(`Please check your answers: ${messages}`);
      } else {
        showFormError("Some of your answers don't look right. Please review the form.");
      }
      return;
    }

    if (!response.ok) {
      showFormError(
        `The server couldn't process this (status ${response.status}). Please try again in a moment.`
      );
      return;
    }

    const data = await response.json();
    renderResult(data.predicted_mental_health_score);
  } catch (err) {
    showFormError(
      "Couldn't reach the prediction server. Make sure the API is running on " +
        API_BASE +
        " and try again."
    );
  } finally {
    setLoading(false);
  }
});

// ---- Reset back to form ----
tryAgainBtn.addEventListener("click", () => {
  resultView.hidden = true;
  form.hidden = false;
  clearFormError();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
});
