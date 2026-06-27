/* global React */
// ─────────────────────────────────────────────────────────────
// WizardFooter — standard bottom navigation for full-page step
// wizards (ui-spec §2.x). One source of truth so every wizard's
// Back / Next / final-action row looks and behaves identically.
//
//   Layout : right-aligned (Back next to the primary action),
//            top hairline divider, 16px top padding.
//   Back   : secondary + chevL, label "Back", DISABLED on step 1
//            (kept in place — never hidden — so layout is stable).
//   Next   : primary + chevR (trailing), label "Next".
//   Final  : primary + check (default) + context verb supplied by
//            the caller (e.g. "Create customer", "Publish").
//
// Usage:
//   <window.WizardFooter
//     step={step} totalSteps={4}
//     onBack={() => setStep(step - 1)}
//     onNext={goNext} nextDisabled={!stepValid}
//     onFinal={submit} finalDisabled={!canSubmit}
//     finalLabel="Create order" finalIcon="check" />
// ─────────────────────────────────────────────────────────────
(function () {
  const WizardFooter = ({
    step,
    totalSteps,
    onBack,
    backDisabled,                 // optional override; defaults to step <= 1
    backLabel = 'Back',
    onNext,
    nextDisabled = false,
    nextLabel = 'Next',
    onFinal,
    finalDisabled = false,
    finalLabel = 'Finish',
    finalIcon = 'check',
  }) => {
    const B = window.Btn || window.Button;
    const isFinal = step >= totalSteps;
    const backOff = backDisabled != null ? backDisabled : step <= 1;
    return (
      <div className="wizard-foot">
        <B variant="secondary" size="md" icon="chevL" disabled={backOff} onClick={onBack}>{backLabel}</B>
        {isFinal ? (
          <B variant="primary" size="md" icon={finalIcon} disabled={finalDisabled} onClick={onFinal}>{finalLabel}</B>
        ) : (
          <B variant="primary" size="md" iconRight="chevR" disabled={nextDisabled} onClick={onNext}>{nextLabel}</B>
        )}
      </div>
    );
  };

  window.WizardFooter = WizardFooter;

  if (!document.getElementById('wizard-foot-styles')) {
    const s = document.createElement('style');
    s.id = 'wizard-foot-styles';
    s.textContent =
      '.wizard-foot{display:flex;align-items:center;justify-content:flex-end;gap:10px;' +
      'margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border-subtle);}';
    document.head.appendChild(s);
  }
})();
