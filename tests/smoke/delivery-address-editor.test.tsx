import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';

const save = vi.fn(async () => undefined);
vi.mock('@/lib/order-operations', () => ({ updateOrderDeliveryAddress: (...args: unknown[]) => save(...(args as [])) }));
vi.mock('@/lib/supabase', () => ({ supabase: {}, publicSupabase: {}, isSupabaseConfigured: true }));

import { DeliveryAddressEditor } from '@/components/admin/DeliveryAddressEditor';

describe('DeliveryAddressEditor', () => {
  afterEach(() => { cleanup(); save.mockClear(); });

  it('lets staff add a missing address and refreshes the order afterwards', async () => {
    const onChanged = vi.fn();
    render(<DeliveryAddressEditor orderId="o-1" address={null} editable onChanged={onChanged} />);
    expect(screen.getByText(/before this order can be dispatched/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Add address'));
    fireEvent.change(screen.getByLabelText('Delivery address'), { target: { value: 'Mombasa Rd, Block C, Nairobi' } });
    fireEvent.click(screen.getByText('Save address'));
    await waitFor(() => expect(save).toHaveBeenCalledWith('o-1', 'Mombasa Rd, Block C, Nairobi'));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('refuses a too-short address without calling the server', async () => {
    render(<DeliveryAddressEditor orderId="o-1" address={null} editable onChanged={() => {}} />);
    fireEvent.click(screen.getByText('Add address'));
    fireEvent.change(screen.getByLabelText('Delivery address'), { target: { value: 'ab' } });
    fireEvent.click(screen.getByText('Save address'));
    await new Promise((r) => setTimeout(r, 100));
    expect(save).not.toHaveBeenCalled();
  });

  it('hides the edit control for completed or cancelled orders', () => {
    render(<DeliveryAddressEditor orderId="o-1" address="Somewhere 12" editable={false} onChanged={() => {}} />);
    expect(screen.queryByText('Edit')).toBeNull();
  });
});
