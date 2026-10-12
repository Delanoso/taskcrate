import { RENT_USD, RENT_ZAR } from "@/data/products";

export function rentLabelShort() {
  return `R${RENT_ZAR.toLocaleString("en-ZA")}/mo`;
}

export function rentLabelFull() {
  return `R${RENT_ZAR.toLocaleString("en-ZA")}/mo ≈ $${RENT_USD} USD`;
}

/** Stripe expects integer cents; ZAR uses cents too (100 cents = R1). */
export function rentAmountCentsZar() {
  return RENT_ZAR * 100;
}
