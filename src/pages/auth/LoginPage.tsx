import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Briefcase, Mail, Lock, Eye, EyeOff, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/authApi';
import { Button } from '../../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const demoCredentials = [
  { role: 'Admin', email: 'admin@fieldforce.com', password: 'Admin@123', color: 'bg-purple-500' },
  { role: 'NSM', email: 'nsm@fieldforce.com', password: 'Nsm@123', color: 'bg-blue-500' },
  { role: 'Regional Manager', email: 'rm@fieldforce.com', password: 'Rm@123', color: 'bg-cyan-500' },
  { role: 'City Manager', email: 'cm@fieldforce.com', password: 'Cm@123', color: 'bg-emerald-500' },
  { role: 'Promoter', email: 'promoter@fieldforce.com', password: 'Promoter@123', color: 'bg-orange-500' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.roleName === 'Admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data: LoginForm) => {
    try {
      const { user, token } = await authApi.login(data);
      login(user, token);
      toast.success(`Welcome back, ${user.fullName}!`);
      if (user.roleName === 'Admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { toast.error('Please enter your email'); return; }
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      toast.success('Password reset link sent to your email!');
      setForgotMode(false);
      setForgotEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Email not found');
    } finally {
      setForgotLoading(false);
    }
  };

  const fillDemo = (cred: typeof demoCredentials[0]) => {
    setValue('email', cred.email);
    setValue('password', cred.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-blue-600/20 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">FieldForce Enterprise</p>
            <p className="text-blue-300 text-xs">Work Management System</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage your field<br />team efficiently
            </h2>
            <p className="text-blue-200 mt-3 text-lg leading-relaxed">
              Track visits, attendance, sales, and orders<br />all in one powerful platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Active Users', value: '500+', color: 'text-blue-300' },
              { label: 'Daily Visits', value: '2,400+', color: 'text-emerald-300' },
              { label: 'Cities Covered', value: '120+', color: 'text-orange-300' },
              { label: 'Uptime', value: '99.9%', color: 'text-cyan-300' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          System operational · All services running
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">FieldForce Enterprise</p>
              <p className="text-blue-300 text-xs">Work Management System</p>
            </div>
          </div>

          <div className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {!forgotMode ? (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-white">Sign in</h1>
                  <p className="text-slate-400 text-sm mt-1">Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@fieldforce.com"
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        {...register('password')}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
                  </div>

                  <div className="flex justify-end">
                    <button type="button" onClick={() => setForgotMode(true)} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 text-sm"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Sign In <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-6">
                  <p className="text-slate-500 text-xs text-center mb-3">Demo Credentials</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {demoCredentials.map(cred => (
                      <button
                        key={cred.role}
                        onClick={() => fillDemo(cred)}
                        className="flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors text-left group"
                      >
                        <span className={`w-2 h-2 rounded-full ${cred.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-300 text-xs font-medium">{cred.role}</span>
                          <span className="text-slate-500 text-xs ml-2">{cred.email}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                  <p className="text-slate-400 text-sm mt-1">Enter your email to receive a reset link</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="you@fieldforce.com"
                        className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 text-sm"
                  >
                    {forgotLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
                  </button>
                  <button onClick={() => setForgotMode(false)} className="w-full text-slate-400 text-sm hover:text-slate-200 transition-colors">
                    ← Back to login
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            FieldForce Enterprise v2.0 · © 2024 All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};
