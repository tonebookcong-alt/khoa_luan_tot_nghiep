'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Check } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserType } from '@/types/api.types';

// Cho phép chữ cái Unicode (tiếng Việt có dấu) + khoảng trắng. Không cho số / ký tự đặc biệt.
const NAME_REGEX = /^[\p{L}\s]+$/u;
const PHONE_REGEX = /^0\d{9}$/;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập họ và tên')
    .min(2, 'Tên ít nhất 2 ký tự')
    .max(50, 'Tên tối đa 50 ký tự')
    .regex(NAME_REGEX, 'Tên chỉ chứa chữ cái và khoảng trắng (không số, không ký tự đặc biệt)'),
  phone: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập số điện thoại')
    .regex(PHONE_REGEX, 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0 (vd: 0358781627)'),
  address: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ')
    .min(3, 'Địa chỉ ít nhất 3 ký tự')
    .max(200, 'Địa chỉ tối đa 200 ký tự'),
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      address: user?.address ?? '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    setSaved(false);
    try {
      const res = await api.patch<UserType>('/users/me', data);
      updateUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Cập nhật thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900 font-headline">Hồ sơ cá nhân</h1>

      <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
              <User className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <p className="font-bold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-primary">
              {user?.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Họ và tên</Label>
            <Input id="name" className="mt-1" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              className="mt-1"
              placeholder="0901234567"
              {...register('phone', {
                onChange: (e) => {
                  // Lọc ký tự không phải số ngay khi gõ
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                  if (cleaned !== e.target.value) e.target.value = cleaned;
                },
              })}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">Địa chỉ</Label>
            <Input id="address" className="mt-1" placeholder="Quận 1, TP.HCM" {...register('address')} />
            {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <><Check className="h-4 w-4" /> Đã lưu</>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
