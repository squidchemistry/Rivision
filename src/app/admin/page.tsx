'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, XCircle, LogOut, Users, DollarSign } from 'lucide-react';

interface PaymentRequest {
  id: string;
  userId: string;
  user?: { email: string; name: string };
  plan: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  billingCycle: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  createdAt: string;
  paymentRequests: Array<{
    id: string;
    status: string;
    plan: string;
    amount: number;
    createdAt: string;
  }>;
}

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'payments' | 'users'>('payments');
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // The API enforces admin access; this just sends other visitors somewhere useful
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }
    if (session?.user?.role !== 'admin') {
      router.push('/profile');
      return;
    }

    if (tab === 'payments') {
      fetchPayments();
    } else {
      fetchUsers();
    }
  }, [session, status, filter, tab]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/payment-requests');
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();

      // Filter by status
      const filtered = filter === 'all' ? data : data.filter((p: PaymentRequest) => p.status === filter);
      setPayments(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/payment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update payment');
      }

      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <AlertCircle className="w-8 h-8 text-red-800" />
        <p className="text-black ml-2">Loading...</p>
      </div>
    );
  }

  if (session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-800 mx-auto" />
          <h2 className="text-2xl font-bold text-black">Access Denied</h2>
          <p className="text-neutral-800">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-32 pb-12 px-4">

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-black">Admin Panel</h1>
            <p className="text-neutral-800 mt-2">Manage payment requests and user upgrades</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 bg-red-600/20 border border-black text-red-800 hover:bg-red-600/30 px-4 py-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { icon: Clock, label: 'Pending', value: payments.filter((p) => p.status === 'pending').length, color: 'yellow' },
            { icon: CheckCircle2, label: 'Approved', value: payments.filter((p) => p.status === 'approved').length, color: 'emerald' },
            { icon: XCircle, label: 'Rejected', value: payments.filter((p) => p.status === 'rejected').length, color: 'red' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="nb-inset border border-black p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-8 h-8 text-${stat.color}-400`} />
                  <div>
                    <p className="text-neutral-800 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-black">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-4 mb-8"
        >
          <button
            onClick={() => setTab('payments')}
            className={`flex items-center gap-2 px-4 py-2  font-medium transition-all ${
              tab === 'payments'
                ? 'nb-btn nb-btn-primary text-black'
                : 'nb-inset text-neutral-800 hover:text-black border border-black'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Payment Requests
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2  font-medium transition-all ${
              tab === 'users'
                ? 'nb-btn nb-btn-primary text-black'
                : 'nb-inset text-neutral-800 hover:text-black border border-black'
            }`}
          >
            <Users className="w-4 h-4" />
            Registered Users
          </button>
        </motion.div>

        {/* Filter (only for payments tab) */}
        {tab === 'payments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 mb-8"
          >
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2  font-medium transition-all capitalize ${
                  filter === f
                    ? 'nb-btn nb-btn-primary text-black'
                    : 'nb-inset text-neutral-800 hover:text-black border border-black'
                }`}
              >
                {f}
              </button>
            ))}
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-nb-coral border border-black text-red-800 px-4 py-3 mb-8">
            {error}
          </div>
        )}

        {/* Payments Table */}
        {tab === 'payments' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="nb-inset border border-black overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center text-neutral-800">Loading payments...</div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black nb-inset">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Method</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Transaction ID</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr key={idx} className="border-b border-black hover:bg-black/5 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-black font-medium">{payment.user?.name || 'Unknown'}</p>
                          <p className="text-xs text-neutral-700">{payment.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-nb-sky text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {payment.plan}
                          {payment.billingCycle === 'annual' ? ' · annual' : ' · monthly'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black font-semibold">₹{payment.amount}</td>
                      <td className="px-6 py-4 text-neutral-800">{payment.paymentMethod === 'bank' ? 'Bank transfer' : payment.paymentMethod.toUpperCase()}</td>
                      <td className="px-6 py-4 text-neutral-800 text-sm"><span className="font-mono select-all">{payment.transactionId}</span></td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payment.status === 'pending'
                              ? 'bg-nb-orange text-yellow-900'
                              : payment.status === 'approved'
                              ? 'bg-nb-lime text-emerald-900'
                              : 'bg-nb-coral text-red-900'
                          }`}
                        >
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(payment.id, 'approved')}
                              className="nb-btn nb-btn-lime text-black px-3 py-1 text-sm transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleApproval(payment.id, 'rejected')}
                              className="nb-btn nb-btn-coral text-black px-3 py-1 text-sm transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-800">No payment requests found</div>
          )}
        </motion.div>
        )}

        {/* Users Table */}
        {tab === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="nb-inset border border-black overflow-hidden"
        >
          {loading ? (
            <div className="p-8 text-center text-neutral-800">Loading users...</div>
          ) : users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black nb-inset">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Current Plan</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-neutral-800">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={idx} className="border-b border-black hover:bg-black/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-black font-medium">{user.name || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 text-neutral-800">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-nb-purple text-purple-900'
                              : 'bg-nb-sky text-blue-900'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-nb-sky text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          {user.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-800 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-neutral-800 text-sm">
                        {user.paymentRequests.length > 0 ? (
                          <div>
                            <p>{new Date(user.paymentRequests[0].createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-neutral-700">{user.paymentRequests[0].status}</p>
                          </div>
                        ) : (
                          'No payments'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-neutral-800">No registered users found</div>
          )}
        </motion.div>
        )}
      </div>
    </div>
  );
}