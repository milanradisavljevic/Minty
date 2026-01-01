# Stocks (Parked)

Status: disabled by default via `STOCKS_ENABLED=false`.

Why disabled
- Prices looked incorrect and could be stale/mismapped.
- API behavior varies by ticker/exchange; mapping needs verification.

Current behavior
- Backend keeps the Yahoo Finance fetch/parsing logic, but it is only loaded when `STOCKS_ENABLED=true`.
- UI shows "Stocks disabled (Backlog)" instead of values.

What is missing before re-enable
- Confirm correct ticker/exchange mapping (e.g., `SAP.DE` vs `SAP`).
- Verify currency handling per listing (no silent conversion).
- Validate "regular market price" selection with live responses.
- Review API limits and consider proxy/CORS constraints for future client-side use.

How to re-enable later
1) Set `STOCKS_ENABLED=true` for the backend.
2) Set `VITE_STOCKS_ENABLED=true` for the frontend.
3) Run `npm run dev` and verify with a few known tickers.
