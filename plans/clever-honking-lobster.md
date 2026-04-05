# Plan: Add Partial Returns

## Context

Currently, returning items always marks the checkout as "returned" even if only some items are returned. The UI accepts a partial quantity, and inventory is correctly restored, but the checkout closes — making it impossible to return the remaining items later. This plan adds true partial return support: a checkout stays "active" until all items are returned.

## Approach

Add a `returned_quantity` field (default 0) to the Checkout model. On each return, increment `returned_quantity` by the return amount. Only set `status="returned"` when `returned_quantity == quantity`. The return validation checks against the **remaining** quantity (`quantity - returned_quantity`), not the original quantity.

No new status value needed — "active" means items still out, "returned" means all items back.

---

## Phase 1: Alembic Migration

Create migration to add `returned_quantity` (Integer, default 0, non-nullable) to `checkouts` table. Set existing "returned" rows to `returned_quantity = quantity`.

**File:** New migration in `backend/alembic/versions/`

---

## Phase 2: Backend Model & Schema

**`backend/app/models/checkout.py`**
- Add `returned_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)` after `quantity`

**`backend/app/schemas/checkout.py`**
- Add `returned_quantity: int` to `CheckoutResponse` (after `quantity`)

**`frontend/src/types/checkout.ts`**
- Add `returned_quantity: number` to `Checkout` interface

---

## Phase 3: Backend CRUD Logic

**`backend/app/crud/checkout.py` — `return_checkout()` (lines 166-186)**

Current behavior:
```python
return_qty = return_in.quantity if return_in.quantity is not None else checkout.quantity
if return_qty > checkout.quantity: raise ValueError(...)
checkout.status = "returned"
checkout.return_date = datetime.now(timezone.utc)
```

New behavior:
```python
remaining = checkout.quantity - checkout.returned_quantity
return_qty = return_in.quantity if return_in.quantity is not None else remaining
if return_qty > remaining:
    raise ValueError(f"Cannot return more than remaining: returning {return_qty}, remaining {remaining}")
checkout.returned_quantity += return_qty
inv.quantity += return_qty
if checkout.returned_quantity == checkout.quantity:
    checkout.status = "returned"
    checkout.return_date = datetime.now(timezone.utc)
```

Key changes:
- Validate against **remaining** (`quantity - returned_quantity`), not `quantity`
- Default return qty is **remaining**, not total
- Increment `returned_quantity` instead of just setting status
- Only mark "returned" + set `return_date` when fully returned
- Multiple returns on the same active checkout are now allowed

---

## Phase 4: Frontend UI

**`frontend/src/views/checkout/CheckoutView.vue`**
- Change `max-quantity` prop from `returningCheckout?.quantity` to `(returningCheckout?.quantity ?? 1) - (returningCheckout?.returned_quantity ?? 0)` (remaining quantity)
- Add a "Returned" column to headers showing `returned_quantity` / `quantity` (e.g. "2 / 5") to give visibility into partial return state

**`frontend/src/components/checkout/ReturnForm.vue`**
- No changes needed — already accepts `maxQuantity` prop and validates against it

---

## Phase 5: Tests

### Backend tests (`backend/tests/test_checkouts.py`)

Add new tests:
- `test_partial_return` — checkout 5, return 2, verify status="active", returned_quantity=2, inventory +2
- `test_partial_return_then_full_return` — checkout 5, return 2, return remaining 3, verify status="returned", returned_quantity=5, inventory fully restored
- `test_partial_return_cannot_exceed_remaining` — checkout 5, return 3, try returning 4 → error
- `test_return_default_quantity_is_remaining` — checkout 5, return 2 explicitly, then return with no quantity → returns remaining 3

Modify existing:
- `test_return_checkout` — verify `returned_quantity == 5` in response (full return still works)

### Frontend unit tests

**`frontend/src/components/checkout/__tests__/ReturnForm.spec.ts`**
- Existing tests sufficient (already tests maxQuantity validation)

### E2E tests (`tests/e2e/06-checkout-return.spec.ts`)

Add test:
- `test('Partial return via API then return remaining')` — create checkout of 5, return 2 via API, verify inventory is 18 (20-5+2=17... wait, 20-5=15 start, then +2=17), verify checkout still active, return remaining 3, verify status=returned, inventory=20

---

## Phase 6: Documentation

**`CLAUDE.md`**
- Update checkout description to mention partial returns

**`README.md`**
- Update checkout process section to mention partial returns are supported

**Swagger** — automatic via Pydantic schema changes (returned_quantity appears in CheckoutResponse)

---

## Verification

1. `cd backend && alembic upgrade head`
2. `cd backend && pytest -v` — all pass
3. `cd frontend && npm run test:unit` — all pass
4. `./scripts/run_e2e.sh` — all pass
5. Smoke test: checkout 5 items, return 2, verify still active with returned_quantity=2, return 3, verify returned

## Files to Modify

| File | Change |
|------|--------|
| `backend/alembic/versions/` (new) | Add `returned_quantity` column |
| `backend/app/models/checkout.py` | Add `returned_quantity` field |
| `backend/app/schemas/checkout.py` | Add `returned_quantity` to response |
| `backend/app/crud/checkout.py` | Fix return logic for partial returns |
| `frontend/src/types/checkout.ts` | Add `returned_quantity` to interface |
| `frontend/src/views/checkout/CheckoutView.vue` | Pass remaining qty to ReturnForm, add returned column |
| `backend/tests/test_checkouts.py` | Add 4 new partial return tests, update 1 existing |
| `tests/e2e/06-checkout-return.spec.ts` | Add partial return E2E test |
| `CLAUDE.md` | Update checkout description |
| `README.md` | Update checkout process docs |
