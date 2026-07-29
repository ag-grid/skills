import { createFormats } from "ag-studio";

interface CurrencyOptions {
  currency: string;
  minimumFractionDigits: number;
}

// A currency format override. In Studio v1 the payload handed to the formatter is
// declared as `options`, and the formatter itself is `valueFormatter`.
export const formats = createFormats({
  overrides: {
    currencyFormat: {
      options: { currency: "GBP", minimumFractionDigits: 2 } as CurrencyOptions,
      valueFormatter: ({ value, options }) =>
        value == null || options == null
          ? ""
          : new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency: options.currency,
              minimumFractionDigits: options.minimumFractionDigits,
            }).format(Number(value)),
    },
  },
});
