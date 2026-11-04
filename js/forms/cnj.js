(() => {
  'use strict';

  const digits = value => String(value ?? '').replace(/\D/g, '');

  function format(value) {
    const number = digits(value).slice(0, 20);
    const lengths = [7, 2, 4, 1, 2, 4];
    const separators = ['', '-', '.', '.', '.', '.'];
    let offset = 0;
    let masked = '';

    for (let i = 0; i < lengths.length && offset < number.length; i++) {
      masked += separators[i] + number.slice(offset, offset + lengths[i]);
      offset += lengths[i];
    }
    return masked;
  }

  function isValid(value) {
    const number = digits(value);
    if (number.length !== 20) return false;
    // NNNNNNN-DD.AAAA.J.TR.OOOO → NNNNNNNAAAAJTROOOODD
    const reordered = number.slice(0, 7) + number.slice(9) + number.slice(7, 9);
    return BigInt(reordered) % 97n === 1n;
  }

  // Exportação compatível com o ERP legado e com o agente Aurora
  window.ERPProcessCNJ = Object.freeze({ digits, format, isValid });
  window.formatarProcessoCNJ = format;
  window.validarDigitoCNJ = isValid;

  const field = document.getElementById('numProcesso');
  const form = document.getElementById('processForm');
  if (!field || !form) return;

  let alertPromise = null;
  let alertOpen = false;
  let resetPending = false;

  function cursorAfter(masked, count) {
    if (count === 0) return 0;
    let seen = 0;
    for (let i = 0; i < masked.length; i++) {
      if (/\d/.test(masked[i]) && ++seen === count) return i + 1;
    }
    return masked.length;
  }

  field.addEventListener('focus', () => { resetPending = false; });

  function maskInput() {
    resetPending = false;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const startDigits = digits(field.value.slice(0, start)).length;
    const endDigits = digits(field.value.slice(0, end)).length;

    field.value = format(field.value);

    const nextStart = cursorAfter(field.value, startDigits);
    const nextEnd = cursorAfter(field.value, endDigits);
    field.setSelectionRange(nextStart, nextEnd);
    field.removeAttribute('aria-invalid');

    // Se estiver digitando no final, garante que o scroll acompanhe até o último dígito
    if (nextEnd >= field.value.length) {
      requestAnimationFrame(() => {
        field.scrollLeft = field.scrollWidth;
      });
    }
  }

  field.addEventListener('input', maskInput);

  // TRATADOR DEFINITIVO DE COLAR (PASTE):
  // Garante 20 dígitos numéricos limpos e rola o campo para o fim visível!
  field.addEventListener('paste', event => {
    event.preventDefault();
    resetPending = false;

    const textoColado = (event.clipboardData || window.clipboardData)?.getData('text') ?? '';
    const apenasDigitos = digits(textoColado).slice(0, 20);

    field.value = format(apenasDigitos);
    field.removeAttribute('aria-invalid');

    const posFinal = field.value.length;
    field.setSelectionRange(posFinal, posFinal);

    // Rola para a direita para o último dígito ficar 100% visível na tela da Letícia
    requestAnimationFrame(() => {
      field.scrollLeft = field.scrollWidth;
    });
  });

  field.addEventListener('beforeinput', event => {
    if (event.isComposing || !event.cancelable || field.selectionStart !== field.selectionEnd) return;
    const start = field.selectionStart;
    const backward = event.inputType === 'deleteContentBackward';
    const forward = event.inputType === 'deleteContentForward';
    if (!backward && !forward) return;

    const adjacent = backward ? start - 1 : start;
    if (adjacent < 0 || adjacent >= field.value.length || !/[-.]/.test(field.value[adjacent])) return;

    let digitIndex = adjacent;
    while (digitIndex >= 0 && digitIndex < field.value.length && /[-.]/.test(field.value[digitIndex])) {
      digitIndex += backward ? -1 : 1;
    }
    if (digitIndex < 0 || digitIndex >= field.value.length) return;

    event.preventDefault();
    field.setRangeText('', digitIndex, digitIndex + 1, 'start');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });

  function warn(reason, refocus) {
    if (!alertOpen) {
      alertOpen = true;
      alertPromise = Swal.fire({
        icon: 'warning',
        title: 'Confira o número do processo',
        text: reason,
        confirmButtonText: 'Vou corrigir',
        returnFocus: false
      }).finally(() => {
        alertPromise = null;
        alertOpen = false;
      });
    }
    if (refocus && alertPromise) {
      alertPromise.then(() => field.focus({ preventScroll: true }));
    }
  }

  function validate(refocus = false) {
    const number = digits(field.value);
    const valid = isValid(number);
    if (number.length <= 20) field.value = format(number);
    field.setAttribute('aria-invalid', String(!valid));

    if (!valid) {
      warn(number.length !== 20
        ? 'O número do processo precisa conter 20 dígitos. Digite ou cole o número completo; os pontos e o hífen são inseridos automaticamente.'
        : 'O dígito verificador não confere. Revise o número do processo e tente novamente.', refocus);
    }
    return valid;
  }

  field.addEventListener('blur', () => {
    if (resetPending) { resetPending = false; return; }
    if (!alertOpen) validate();
  });

  field.addEventListener('invalid', event => {
    event.preventDefault();
    validate(true);
  });

  form.addEventListener('submit', event => {
    if (!validate(true)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  form.addEventListener('reset', () => {
    resetPending = true;
    field.removeAttribute('aria-invalid');
  });
})();
