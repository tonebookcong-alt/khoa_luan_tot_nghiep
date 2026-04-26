'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Smartphone, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthResponse } from '@/types/api.types';

const schema = z.object({
  name: z.string().min(2, 'Tên ít nhất 2 ký tự'),
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const { confirmPassword: _, ...payload } = data;
      const res = await api.post<AuthResponse>('/auth/register', payload);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.push('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Đăng ký thất bại'));
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-headline">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-slate-500">Tham gia PhoneMarket để mua bán điện thoại</p>
        </div>

        <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Họ và tên</Label>
              <Input id="name" placeholder="Nguyễn Văn A" className="mt-1" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className={`mt-1 ${errors.email ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : ''}`} {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Số điện thoại (tuỳ chọn)</Label>
              <Input id="phone" placeholder="0901234567" className="mt-1" {...register('phone')} />
            </div>

            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" placeholder="Ít nhất 6 ký tự" className="mt-1" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input id="confirmPassword" type="password" placeholder="Nhập lại mật khẩu" className={`mt-1 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-100 focus:border-red-400' : ''}`} {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
