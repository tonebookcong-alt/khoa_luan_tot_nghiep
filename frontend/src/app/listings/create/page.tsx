'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Loader2, Sparkles, ChevronDown, MapPin } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AiPricingResult } from '@/components/listings/AiPricingResult';
import { Listing, Category } from '@/types/api.types';

const schema = z.object({
  title: z.string().min(10, 'Tiêu đề ít nhất 10 ký tự'),
  description: z.string().min(20, 'Mô tả ít nhất 20 ký tự'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']),
  askingPrice: z.number().min(100000, 'Giá tối thiểu 100,000đ'),
  brand: z.string().min(1, 'Vui lòng chọn thương hiệu'),
  model: z.string().min(1, 'Vui lòng nhập model'),
  categoryId: z.string().optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  origin: z.string().optional(),
  warranty: z.string().optional(),
  iphoneVersion: z.string().optional(),
  location: z.string().optional(),
  accessories: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AiPricingData {
  pMarket: number;
  pFinal: number;
  priceRange: { low: number; high: number };
  damageBreakdown: { part: string; severity: number; description: string; weight: number; deductionPercent: number }[];
  confidenceScore: number;
  detectedModel: string;
  overallCondition: string;
  summary: string;
  marketSummary: string;
  dataPoints: number;
  imageType?: 'real_device' | 'marketing' | 'unclear';
}

const CONDITIONS = [
  { value: 'NEW', label: 'Mới 100%' },
  { value: 'LIKE_NEW', label: 'Như mới (99%)' },
  { value: 'GOOD', label: 'Tốt (90-98%)' },
  { value: 'FAIR', label: 'Khá (70-89%)' },
  { value: 'POOR', label: 'Kém (<70%)' },
] as const;

const BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Huawei', 'Realme', 'OnePlus',
  'Motorola', 'Sony', 'Nokia', 'Google', 'Honor', 'Nothing', 'RedMagic',
  'LG', 'ASUS', 'BKAV', 'Khác',
];

const PHONE_MODELS: Record<string, string[]> = {
  Apple: [
    // SE
    'iPhone SE (Thế hệ 1)', 'iPhone SE (Thế hệ 2)', 'iPhone SE (Thế hệ 3)',
    // Tiêu chuẩn
    'iPhone 6', 'iPhone 6 Plus', 'iPhone 6s', 'iPhone 6s Plus',
    'iPhone 7', 'iPhone 7 Plus',
    'iPhone 8', 'iPhone 8 Plus',
    'iPhone XR',
    'iPhone 11', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 13', 'iPhone 13 mini',
    'iPhone 14', 'iPhone 14 Plus',
    'iPhone 15', 'iPhone 15 Plus',
    'iPhone 16', 'iPhone 16 Plus', 'iPhone 16e',
    'iPhone 17', 'iPhone 17e', 'iPhone Air',
    'iPhone 18',
    // Pro
    'iPhone X', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPhone 17 Pro', 'iPhone 17 Pro Max',
    'iPhone 18 Pro', 'iPhone 18 Pro Max',
    // Đặc biệt
    'iPhone Fold',
    'Khác',
  ],
  Samsung: [
    // Galaxy S
    'Galaxy S7', 'Galaxy S7 Edge',
    'Galaxy S8', 'Galaxy S8+',
    'Galaxy S9', 'Galaxy S9+',
    'Galaxy S10e', 'Galaxy S10', 'Galaxy S10+',
    'Galaxy S20', 'Galaxy S20+', 'Galaxy S20 Ultra', 'Galaxy S20 FE',
    'Galaxy S21', 'Galaxy S21+', 'Galaxy S21 Ultra', 'Galaxy S21 FE',
    'Galaxy S22', 'Galaxy S22+', 'Galaxy S22 Ultra',
    'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra', 'Galaxy S23 FE',
    'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra', 'Galaxy S24 FE',
    'Galaxy S25', 'Galaxy S25+', 'Galaxy S25 Ultra', 'Galaxy S25 FE', 'Galaxy S25 Edge',
    'Galaxy S26', 'Galaxy S26+', 'Galaxy S26 Ultra',
    // Galaxy Note
    'Galaxy Note 7', 'Galaxy Note 8', 'Galaxy Note FE',
    'Galaxy Note 9', 'Galaxy Note 10', 'Galaxy Note 10+',
    'Galaxy Note 20', 'Galaxy Note 20 Ultra',
    // Galaxy Z
    'Galaxy Fold', 'Galaxy Z Fold 2', 'Galaxy Z Fold 3', 'Galaxy Z Fold 4',
    'Galaxy Z Fold 5', 'Galaxy Z Fold 6', 'Galaxy Z Fold 7', 'Galaxy Z Fold 8',
    'Galaxy Z Fold SE',
    'Galaxy Z Flip', 'Galaxy Z Flip 3', 'Galaxy Z Flip 4', 'Galaxy Z Flip 5',
    'Galaxy Z Flip 6', 'Galaxy Z Flip 7', 'Galaxy Z Flip 7 FE', 'Galaxy Z Flip 8',
    'Galaxy Z TriFold',
    // Galaxy A
    'Galaxy A10', 'Galaxy A20', 'Galaxy A30', 'Galaxy A40', 'Galaxy A50', 'Galaxy A70',
    'Galaxy A11', 'Galaxy A21', 'Galaxy A31', 'Galaxy A41', 'Galaxy A51', 'Galaxy A71',
    'Galaxy A12', 'Galaxy A22', 'Galaxy A32', 'Galaxy A52', 'Galaxy A72',
    'Galaxy A13', 'Galaxy A23', 'Galaxy A33', 'Galaxy A53', 'Galaxy A73',
    'Galaxy A14', 'Galaxy A24', 'Galaxy A34', 'Galaxy A54',
    'Galaxy A15', 'Galaxy A25', 'Galaxy A35', 'Galaxy A55',
    'Galaxy A16', 'Galaxy A17', 'Galaxy A36', 'Galaxy A37',
    'Galaxy A56 5G', 'Galaxy A57',
    // Galaxy M
    'Galaxy M10', 'Galaxy M20', 'Galaxy M30', 'Galaxy M31', 'Galaxy M32',
    'Galaxy M33', 'Galaxy M52', 'Galaxy M53', 'Galaxy M54', 'Galaxy M55', 'Galaxy M56 5G',
    'Khác',
  ],
  Xiaomi: [
    // Xiaomi số
    'Mi 9', 'Mi 10', 'Mi 10 Pro', 'Mi 10 Ultra',
    'Mi 11', 'Mi 11 Pro', 'Mi 11 Ultra', 'Mi 11X',
    'Xiaomi 12', 'Xiaomi 12 Pro', 'Xiaomi 12 Ultra', 'Xiaomi 12S', 'Xiaomi 12S Pro', 'Xiaomi 12S Ultra',
    'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 13 Ultra', 'Xiaomi 13T', 'Xiaomi 13T Pro',
    'Xiaomi 14', 'Xiaomi 14 Pro', 'Xiaomi 14 Ultra', 'Xiaomi 14T', 'Xiaomi 14T Pro',
    'Xiaomi 15', 'Xiaomi 15 Pro', 'Xiaomi 15 Ultra',
    'Xiaomi 17', 'Xiaomi 17 Ultra',
    // Civi
    'Xiaomi Civi 1', 'Xiaomi Civi 2', 'Xiaomi Civi 3', 'Xiaomi Civi 4 Pro',
    // Redmi Note
    'Redmi Note 3', 'Redmi Note 4', 'Redmi Note 5', 'Redmi Note 5 Pro',
    'Redmi Note 6 Pro', 'Redmi Note 7', 'Redmi Note 8', 'Redmi Note 8 Pro',
    'Redmi Note 9', 'Redmi Note 9S', 'Redmi Note 9 Pro',
    'Redmi Note 10', 'Redmi Note 10S', 'Redmi Note 10 Pro',
    'Redmi Note 11', 'Redmi Note 11S', 'Redmi Note 11 Pro',
    'Redmi Note 12', 'Redmi Note 12S', 'Redmi Note 12 Pro', 'Redmi Note 12 Pro+',
    'Redmi Note 13', 'Redmi Note 13 Pro', 'Redmi Note 13 Pro+',
    'Redmi Note 14', 'Redmi Note 14 Pro', 'Redmi Note 15 Pro+', 'Redmi Note 16',
    'Redmi 13C',
    // Redmi K
    'Redmi K20', 'Redmi K20 Pro', 'Redmi K30', 'Redmi K30 Pro',
    'Redmi K40', 'Redmi K40 Pro', 'Redmi K50', 'Redmi K50 Pro',
    'Redmi K60', 'Redmi K60 Pro', 'Redmi K70', 'Redmi K70 Pro',
    'Redmi K80', 'Redmi K80 Pro', 'Redmi K90', 'Redmi K90 Pro', 'Redmi K100',
    // POCO
    'POCO F1 (Pocophone F1)', 'POCO F2 Pro', 'POCO F4', 'POCO F5', 'POCO F6', 'POCO F7',
    'POCO X2', 'POCO X3', 'POCO X3 Pro', 'POCO X4', 'POCO X4 Pro',
    'POCO X5', 'POCO X5 Pro', 'POCO X6', 'POCO X6 Pro',
    'POCO X7', 'POCO X7 Pro', 'POCO X8 Pro', 'POCO X8 Pro Max',
    'POCO M2', 'POCO M3', 'POCO M4', 'POCO M5', 'POCO M6', 'POCO M7',
    'POCO C31', 'POCO C40', 'POCO C50', 'POCO C61', 'POCO C71',
    'Khác',
  ],
  OPPO: [
    // Find X
    'OPPO Find X', 'OPPO Find X2', 'OPPO Find X2 Pro',
    'OPPO Find X3', 'OPPO Find X3 Pro',
    'OPPO Find X5', 'OPPO Find X5 Pro',
    'OPPO Find X6', 'OPPO Find X6 Pro',
    'OPPO Find X7', 'OPPO Find X7 Ultra',
    'OPPO Find X8', 'OPPO Find X8 Pro',
    'OPPO Find X9', 'OPPO Find X9 Pro',
    // Find N (gập)
    'OPPO Find N', 'OPPO Find N2', 'OPPO Find N2 Flip',
    'OPPO Find N3', 'OPPO Find N3 Flip',
    'OPPO Find N5', 'OPPO Find N6',
    // Reno
    'OPPO Reno', 'OPPO Reno 2', 'OPPO Reno 3', 'OPPO Reno 4', 'OPPO Reno 5',
    'OPPO Reno 6', 'OPPO Reno 7', 'OPPO Reno 8', 'OPPO Reno 9',
    'OPPO Reno 10', 'OPPO Reno 10 Pro',
    'OPPO Reno 11', 'OPPO Reno 11 Pro',
    'OPPO Reno 12', 'OPPO Reno 12 Pro',
    'OPPO Reno 13', 'OPPO Reno 13 Pro',
    'OPPO Reno 14', 'OPPO Reno 15 5G',
    // A / F / K
    'OPPO A18', 'OPPO A38', 'OPPO A52', 'OPPO A53', 'OPPO A54', 'OPPO A55',
    'OPPO A57', 'OPPO A58', 'OPPO A74', 'OPPO A76', 'OPPO A77', 'OPPO A78',
    'OPPO A94', 'OPPO A6 Pro',
    'OPPO F11', 'OPPO F17', 'OPPO F19', 'OPPO F21', 'OPPO F23', 'OPPO F27', 'OPPO F31',
    'OPPO K3', 'OPPO K5', 'OPPO K7', 'OPPO K9', 'OPPO K10', 'OPPO K12', 'OPPO K14',
    'Khác',
  ],
  Vivo: [
    // X premium
    'vivo X7', 'vivo NEX', 'vivo NEX S',
    'vivo X50', 'vivo X50 Pro', 'vivo X60', 'vivo X60 Pro', 'vivo X60 Pro+',
    'vivo X70', 'vivo X70 Pro', 'vivo X70 Pro+',
    'vivo X80', 'vivo X80 Pro', 'vivo X90', 'vivo X90 Pro', 'vivo X90 Pro+',
    'vivo X100', 'vivo X100 Pro', 'vivo X100 Ultra',
    'vivo X200', 'vivo X200 Pro', 'vivo X200 Ultra',
    'vivo X300', 'vivo X300 Pro',
    // X Fold (gập)
    'vivo X Fold', 'vivo X Fold 2', 'vivo X Fold 3', 'vivo X Fold 3 Pro', 'vivo X Fold 5',
    // V
    'vivo V1', 'vivo V3', 'vivo V5', 'vivo V7', 'vivo V9', 'vivo V11', 'vivo V15',
    'vivo V17', 'vivo V19', 'vivo V20', 'vivo V21', 'vivo V23', 'vivo V25',
    'vivo V27', 'vivo V27e', 'vivo V29', 'vivo V29e',
    'vivo V30', 'vivo V30 Pro', 'vivo V40', 'vivo V40 Pro',
    'vivo V50', 'vivo V50 Pro', 'vivo V60', 'vivo V70',
    // Y / iQOO
    'vivo Y51', 'vivo Y52', 'vivo Y53', 'vivo Y55', 'vivo Y66', 'vivo Y68', 'vivo Y72',
    'vivo Y200 5G', 'vivo Y300', 'vivo Y400',
    'iQOO 12', 'iQOO 13', 'iQOO Neo 7', 'iQOO Neo 9', 'iQOO Z6 Pro',
    'Khác',
  ],
  Huawei: [
    // P / Pura
    'Huawei P9', 'Huawei P10', 'Huawei P20', 'Huawei P20 Pro',
    'Huawei P30', 'Huawei P30 Pro',
    'Huawei P40', 'Huawei P40 Pro',
    'Huawei P50', 'Huawei P50 Pro',
    'Huawei P60', 'Huawei P60 Pro',
    'Huawei Pura 70', 'Huawei Pura 70 Pro', 'Huawei Pura 70 Ultra',
    'Huawei Pura 80', 'Huawei Pura 80 Pro',
    // Mate
    'Huawei Mate 9', 'Huawei Mate 10', 'Huawei Mate 20', 'Huawei Mate 20 Pro',
    'Huawei Mate 30', 'Huawei Mate 30 Pro',
    'Huawei Mate 40', 'Huawei Mate 40 Pro',
    'Huawei Mate 50', 'Huawei Mate 50 Pro',
    'Huawei Mate 60', 'Huawei Mate 60 Pro',
    'Huawei Mate 70', 'Huawei Mate 70 Pro',
    'Huawei Mate 80', 'Huawei Mate 80 Pro',
    // Mate X (gập)
    'Huawei Mate X', 'Huawei Mate X2', 'Huawei Mate X3', 'Huawei Mate X5', 'Huawei Mate X6',
    'Huawei Mate XT (Gập 3)',
    // Nova
    'Huawei Nova 12', 'Huawei Nova 12 Pro',
    'Khác',
  ],
  Realme: [
    // Số
    'realme 1', 'realme 2', 'realme 3', 'realme 5', 'realme 6', 'realme 7',
    'realme 8', 'realme 9', 'realme 10', 'realme 11',
    'realme 12', 'realme 12 Pro', 'realme 12 Pro+',
    'realme 13', 'realme 13 Pro+',
    'realme 15', 'realme 16 Pro',
    // GT
    'realme GT', 'realme GT 2', 'realme GT 2 Pro', 'realme GT 3',
    'realme GT Neo 3', 'realme GT Neo 5', 'realme GT 5',
    'realme GT 6', 'realme GT Neo 6', 'realme GT 7', 'realme GT7 Pro',
    // C / Narzo / P
    'realme C55', 'realme C65', 'realme C67',
    'realme Narzo 70',
    'realme P4 Power',
    'Khác',
  ],
  OnePlus: [
    // Flagship
    'OnePlus 3', 'OnePlus 3T', 'OnePlus 5', 'OnePlus 5T',
    'OnePlus 6', 'OnePlus 6T',
    'OnePlus 7', 'OnePlus 7T', 'OnePlus 7 Pro', 'OnePlus 7T Pro',
    'OnePlus 8', 'OnePlus 8 Pro', 'OnePlus 8T',
    'OnePlus 9', 'OnePlus 9 Pro', 'OnePlus 9R',
    'OnePlus 10', 'OnePlus 10 Pro', 'OnePlus 10T',
    'OnePlus 11', 'OnePlus 11R',
    'OnePlus 12', 'OnePlus 12R',
    'OnePlus 13', 'OnePlus 14 Pro', 'OnePlus 15',
    'OnePlus Open',
    // Nord
    'OnePlus Nord N10', 'OnePlus Nord N20', 'OnePlus Nord N100',
    'OnePlus Nord N200', 'OnePlus Nord N300',
    'OnePlus Nord CE', 'OnePlus Nord CE 2', 'OnePlus Nord CE 3', 'OnePlus Nord CE 4',
    'OnePlus Nord 4',
    'Khác',
  ],
  Motorola: [
    // Moto G
    'Moto G4', 'Moto G5', 'Moto G6', 'Moto G7', 'Moto G8', 'Moto G9',
    'Moto G10', 'Moto G30', 'Moto G50', 'Moto G51', 'Moto G52', 'Moto G53',
    'Moto G54', 'Moto G60', 'Moto G62', 'Moto G72', 'Moto G82',
    'Moto G84', 'Moto G85', 'Moto G96', 'Moto G17',
    // Razr
    'Motorola Razr 2019', 'Motorola Razr 5G',
    'Motorola Razr 40', 'Motorola Razr 40 Ultra',
    'Motorola Razr 50', 'Motorola Razr 50 Ultra',
    'Motorola Razr 60', 'Motorola Razr 70 Ultra',
    // Edge
    'Motorola Edge 20', 'Motorola Edge 30', 'Motorola Edge 40',
    'Motorola Edge 50 Fusion', 'Motorola Edge 50 Pro', 'Motorola Edge 50 Ultra',
    'Motorola Edge 60', 'Motorola Edge 70', 'Motorola Edge 70 Fusion',
    'Khác',
  ],
  Sony: [
    'Xperia 1', 'Xperia 1 II', 'Xperia 1 III', 'Xperia 1 IV', 'Xperia 1 V', 'Xperia 1 VI', 'Xperia 1 VII',
    'Xperia 5', 'Xperia 5 II', 'Xperia 5 III', 'Xperia 5 IV', 'Xperia 5 V',
    'Xperia 10', 'Xperia 10 II', 'Xperia 10 III', 'Xperia 10 IV', 'Xperia 10 V', 'Xperia 10 VI', 'Xperia 10 VII',
    'Khác',
  ],
  Nokia: [
    'Nokia C21', 'Nokia C22', 'Nokia C32', 'Nokia C42',
    'Nokia G20', 'Nokia G21', 'Nokia G22', 'Nokia G42',
    'Nokia X20', 'Nokia X30', 'Nokia XR20', 'Nokia XR21',
    'Nokia 9 PureView',
    'HMD Pulse', 'HMD Pulse+', 'HMD Skyline', 'HMD Fusion',
    'Khác',
  ],
  Google: [
    'Pixel 6', 'Pixel 6 Pro', 'Pixel 6a',
    'Pixel 7', 'Pixel 7 Pro', 'Pixel 7a',
    'Pixel 8', 'Pixel 8 Pro', 'Pixel 8a',
    'Pixel 9', 'Pixel 9 Pro', 'Pixel 9 Pro XL', 'Pixel 9 Pro Fold', 'Pixel 9a',
    'Pixel 10', 'Pixel 10 Pro', 'Pixel 10 Pro XL', 'Pixel 10a',
    'Pixel 11', 'Pixel 11 Pro',
    'Khác',
  ],
  Honor: [
    'Honor Magic 5', 'Honor Magic 5 Pro', 'Honor Magic 5 RSR',
    'Honor Magic 6', 'Honor Magic 6 Pro', 'Honor Magic 6 RSR',
    'Honor Magic 8 Pro',
    'Honor Magic V2', 'Honor Magic V3', 'Honor Magic V5', 'Honor Magic V6',
    'Honor Robot Phone',
    'Khác',
  ],
  Nothing: [
    'Nothing Phone 1', 'Nothing Phone 2', 'Nothing Phone 2a',
    'Nothing Phone 3', 'Nothing Phone 3 Pro',
    'Nothing Phone 4a', 'Nothing Phone 4a Pro',
    'Khác',
  ],
  RedMagic: [
    'RedMagic 9', 'RedMagic 9 Pro',
    'RedMagic 10', 'RedMagic 10 Pro',
    'RedMagic 11', 'RedMagic 11 Pro', 'RedMagic 11 Air',
    'Khác',
  ],
  LG: [
    'LG G5', 'LG G6', 'LG G7', 'LG G8',
    'LG V10', 'LG V20', 'LG V30', 'LG V40', 'LG V50', 'LG V50s', 'LG V60',
    'LG Velvet', 'LG Wing',
    'Khác',
  ],
  ASUS: [
    'ASUS ZenFone 3', 'ASUS ZenFone 4', 'ASUS ZenFone 5', 'ASUS ZenFone 6',
    'ASUS ZenFone 7', 'ASUS ZenFone 8', 'ASUS ZenFone 9', 'ASUS ZenFone 10',
    'ASUS ZenFone 11 Ultra', 'ASUS ZenFone 12 Ultra',
    'ASUS ROG Phone', 'ASUS ROG Phone 2', 'ASUS ROG Phone 3',
    'ASUS ROG Phone 5', 'ASUS ROG Phone 6', 'ASUS ROG Phone 7',
    'ASUS ROG Phone 8', 'ASUS ROG Phone 8 Pro',
    'ASUS ROG Phone 9', 'ASUS ROG Phone 9 Pro',
    'Khác',
  ],
  BKAV: ['Bphone B40', 'Bphone B60', 'Bphone B86', 'Khác'],
  Khác: ['Khác'],
};

const ADDRESS_DATA: Record<string, string[]> = {
  'Hà Nội': [
    'Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Đống Đa', 'Quận Hai Bà Trưng',
    'Quận Hoàng Mai', 'Quận Thanh Xuân', 'Quận Cầu Giấy', 'Quận Long Biên',
    'Quận Nam Từ Liêm', 'Quận Bắc Từ Liêm', 'Quận Tây Hồ', 'Quận Hà Đông',
    'Huyện Gia Lâm', 'Huyện Đông Anh', 'Huyện Sóc Sơn', 'Huyện Thanh Trì',
    'Huyện Thường Tín', 'Huyện Phú Xuyên', 'Huyện Hoài Đức', 'Huyện Đan Phượng',
    'Huyện Mê Linh', 'Huyện Chương Mỹ', 'Huyện Ba Vì', 'Huyện Phúc Thọ',
    'Huyện Thạch Thất', 'Huyện Quốc Oai', 'Huyện Ứng Hòa', 'Huyện Mỹ Đức',
    'TP. Hòa Bình', 'Huyện Lương Sơn', 'Huyện Kim Bôi', 'Huyện Tân Lạc', 'Huyện Lạc Sơn',
  ],
  'TP. Hồ Chí Minh': [
    'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
    'Quận 10', 'Quận 11', 'Quận 12',
    'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình',
    'Quận Tân Phú', 'Quận Bình Tân', 'TP. Thủ Đức',
    'Huyện Bình Chánh', 'Huyện Hóc Môn', 'Huyện Củ Chi', 'Huyện Nhà Bè', 'Huyện Cần Giờ',
  ],
  'Hải Phòng': [
    'Quận Hồng Bàng', 'Quận Ngô Quyền', 'Quận Lê Chân', 'Quận Hải An',
    'Quận Kiến An', 'Quận Đồ Sơn', 'Quận Dương Kinh',
    'Huyện An Dương', 'Huyện An Lão', 'Huyện Kiến Thụy', 'Huyện Tiên Lãng',
    'Huyện Vĩnh Bảo', 'Huyện Thủy Nguyên', 'Huyện Cát Hải',
    'TP. Hải Dương', 'TP. Chí Linh', 'TX. Kinh Môn',
    'Huyện Cẩm Giàng', 'Huyện Bình Giang', 'Huyện Nam Sách', 'Huyện Kim Thành',
  ],
  'Đà Nẵng': [
    'Quận Hải Châu', 'Quận Thanh Khê', 'Quận Sơn Trà', 'Quận Ngũ Hành Sơn',
    'Quận Liên Chiểu', 'Quận Cẩm Lệ', 'Huyện Hòa Vang',
    'TP. Tam Kỳ', 'TP. Hội An', 'TX. Điện Bàn',
    'Huyện Duy Xuyên', 'Huyện Đại Lộc', 'Huyện Núi Thành', 'Huyện Thăng Bình',
  ],
  'Cần Thơ': [
    'Quận Ninh Kiều', 'Quận Bình Thủy', 'Quận Cái Răng', 'Quận Ô Môn', 'Quận Thốt Nốt',
    'Huyện Phong Điền', 'Huyện Cờ Đỏ', 'Huyện Vĩnh Thạnh', 'Huyện Thới Lai',
    'TP. Vị Thanh', 'TX. Ngã Bảy', 'TP. Long Mỹ',
    'Huyện Châu Thành A', 'Huyện Vị Thủy', 'Huyện Phụng Hiệp',
  ],
  'Huế': [
    'Quận Phú Xuân', 'Quận Thuận Hóa', 'Quận Phú Vang',
    'TX. Hương Thủy', 'TX. Hương Trà',
    'Huyện Phong Điền', 'Huyện Quảng Điền', 'Huyện Phú Lộc', 'Huyện Nam Đông', 'Huyện A Lưới',
  ],
  'Quảng Ninh': [
    'TP. Hạ Long', 'TP. Móng Cái', 'TP. Cẩm Phả', 'TP. Uông Bí',
    'TX. Quảng Yên', 'TX. Đông Triều',
    'Huyện Vân Đồn', 'Huyện Tiên Yên', 'Huyện Bình Liêu', 'Huyện Ba Chẽ',
  ],
  'Vĩnh Phúc - Phú Thọ': [
    'TP. Vĩnh Yên', 'TX. Phúc Yên',
    'Huyện Lập Thạch', 'Huyện Tam Dương', 'Huyện Vĩnh Tường', 'Huyện Yên Lạc', 'Huyện Tam Đảo',
    'TP. Việt Trì', 'TX. Phú Thọ',
    'Huyện Đoan Hùng', 'Huyện Thanh Ba', 'Huyện Phù Ninh', 'Huyện Yên Lập', 'Huyện Cẩm Khê',
  ],
  'Thái Nguyên - Bắc Kạn': [
    'TP. Thái Nguyên', 'TP. Sông Công', 'TX. Phổ Yên',
    'Huyện Đồng Hỷ', 'Huyện Võ Nhai', 'Huyện Định Hóa', 'Huyện Đại Từ', 'Huyện Phú Bình',
    'TP. Bắc Kạn',
    'Huyện Ba Bể', 'Huyện Ngân Sơn', 'Huyện Na Rì', 'Huyện Bạch Thông',
  ],
  'Lạng Sơn - Bắc Giang': [
    'TP. Lạng Sơn',
    'Huyện Cao Lộc', 'Huyện Văn Lãng', 'Huyện Lộc Bình', 'Huyện Đình Lập', 'Huyện Chi Lăng',
    'TP. Bắc Giang',
    'Huyện Lạng Giang', 'Huyện Lục Ngạn', 'Huyện Sơn Động', 'Huyện Yên Thế', 'Huyện Hiệp Hòa',
  ],
  'Cao Bằng': [
    'TP. Cao Bằng',
    'Huyện Bảo Lạc', 'Huyện Bảo Lâm', 'Huyện Hà Quảng', 'Huyện Trùng Khánh',
    'Huyện Hòa An', 'Huyện Quảng Uyên', 'Huyện Thạch An', 'Huyện Nguyên Bình',
  ],
  'Hà Giang - Tuyên Quang': [
    'TP. Hà Giang',
    'Huyện Bắc Mê', 'Huyện Đồng Văn', 'Huyện Mèo Vạc', 'Huyện Yên Minh', 'Huyện Quản Bạ',
    'TP. Tuyên Quang',
    'Huyện Na Hang', 'Huyện Chiêm Hóa', 'Huyện Yên Sơn', 'Huyện Hàm Yên', 'Huyện Sơn Dương',
  ],
  'Lào Cai - Yên Bái': [
    'TP. Lào Cai', 'TX. Sa Pa',
    'Huyện Bát Xát', 'Huyện Mường Khương', 'Huyện Si Ma Cai', 'Huyện Bắc Hà', 'Huyện Văn Bàn',
    'TP. Yên Bái', 'TX. Nghĩa Lộ',
    'Huyện Mù Cang Chải', 'Huyện Trạm Tấu', 'Huyện Văn Chấn', 'Huyện Lục Yên',
  ],
  'Điện Biên - Lai Châu': [
    'TP. Điện Biên Phủ', 'TX. Mường Lay',
    'Huyện Điện Biên', 'Huyện Điện Biên Đông', 'Huyện Mường Chà', 'Huyện Tủa Chùa', 'Huyện Tuần Giáo',
    'TP. Lai Châu',
    'Huyện Phong Thổ', 'Huyện Sìn Hồ', 'Huyện Tân Uyên', 'Huyện Nậm Nhùn',
  ],
  'Sơn La': [
    'TP. Sơn La',
    'Huyện Mai Sơn', 'Huyện Mộc Châu', 'Huyện Thuận Châu', 'Huyện Yên Châu',
    'Huyện Quỳnh Nhai', 'Huyện Bắc Yên', 'Huyện Phù Yên', 'Huyện Mường La', 'Huyện Sông Mã',
  ],
  'Bắc Ninh - Hưng Yên': [
    'TP. Bắc Ninh', 'TP. Từ Sơn',
    'Huyện Tiên Du', 'Huyện Yên Phong', 'Huyện Thuận Thành', 'Huyện Gia Bình', 'Huyện Lương Tài',
    'TP. Hưng Yên', 'TX. Mỹ Hào',
    'Huyện Văn Lâm', 'Huyện Văn Giang', 'Huyện Khoái Châu', 'Huyện Kim Động', 'Huyện Ân Thi',
  ],
  'Hà Nam - Nam Định - Ninh Bình': [
    'TP. Phủ Lý',
    'Huyện Duy Tiên', 'Huyện Kim Bảng', 'Huyện Lý Nhân', 'Huyện Bình Lục',
    'TP. Nam Định',
    'Huyện Mỹ Lộc', 'Huyện Vụ Bản', 'Huyện Ý Yên', 'Huyện Nam Trực', 'Huyện Trực Ninh', 'Huyện Xuân Trường',
    'TP. Ninh Bình', 'TP. Tam Điệp',
    'Huyện Hoa Lư', 'Huyện Gia Viễn', 'Huyện Nho Quan', 'Huyện Kim Sơn', 'Huyện Yên Mô',
  ],
  'Thái Bình': [
    'TP. Thái Bình',
    'Huyện Quỳnh Phụ', 'Huyện Hưng Hà', 'Huyện Đông Hưng', 'Huyện Vũ Thư',
    'Huyện Kiến Xương', 'Huyện Tiền Hải', 'Huyện Thái Thụy',
  ],
  'Nghệ An - Hà Tĩnh': [
    'TP. Vinh', 'TX. Cửa Lò', 'TX. Thái Hòa',
    'Huyện Diễn Châu', 'Huyện Quỳnh Lưu', 'Huyện Nghi Lộc', 'Huyện Yên Thành', 'Huyện Anh Sơn',
    'TP. Hà Tĩnh', 'TX. Hồng Lĩnh', 'TX. Kỳ Anh',
    'Huyện Cẩm Xuyên', 'Huyện Thạch Hà', 'Huyện Can Lộc', 'Huyện Đức Thọ',
  ],
  'Quảng Bình - Quảng Trị': [
    'TP. Đồng Hới',
    'Huyện Bố Trạch', 'Huyện Lệ Thủy', 'Huyện Quảng Ninh', 'Huyện Quảng Trạch', 'Huyện Tuyên Hóa',
    'TP. Đông Hà', 'TX. Quảng Trị',
    'Huyện Triệu Phong', 'Huyện Hải Lăng', 'Huyện Cam Lộ', 'Huyện Vĩnh Linh', 'Huyện Gio Linh',
  ],
  'Quảng Ngãi - Bình Định': [
    'TP. Quảng Ngãi',
    'Huyện Bình Sơn', 'Huyện Sơn Tịnh', 'Huyện Tư Nghĩa', 'Huyện Mộ Đức', 'Huyện Đức Phổ',
    'TP. Quy Nhơn',
    'TX. An Nhơn', 'Huyện Hoài Nhơn', 'Huyện Phù Cát', 'Huyện Tuy Phước', 'Huyện Phù Mỹ',
  ],
  'Phú Yên - Khánh Hòa': [
    'TP. Tuy Hòa', 'TX. Sông Cầu',
    'Huyện Đông Hòa', 'Huyện Tây Hòa', 'Huyện Sơn Hòa', 'Huyện Phú Hòa',
    'TP. Nha Trang', 'TP. Cam Ranh', 'TX. Ninh Hòa',
    'Huyện Diên Khánh', 'Huyện Khánh Vĩnh', 'Huyện Khánh Sơn', 'Huyện Vạn Ninh',
  ],
  'Lâm Đồng - Ninh Thuận - Bình Thuận': [
    'TP. Đà Lạt', 'TP. Bảo Lộc',
    'Huyện Đức Trọng', 'Huyện Di Linh', 'Huyện Lâm Hà', 'Huyện Đơn Dương', 'Huyện Bảo Lâm',
    'TP. Phan Rang - Tháp Chàm',
    'Huyện Ninh Hải', 'Huyện Ninh Phước', 'Huyện Thuận Nam', 'Huyện Thuận Bắc',
    'TP. Phan Thiết', 'TX. La Gi',
    'Huyện Bắc Bình', 'Huyện Hàm Thuận Bắc', 'Huyện Hàm Thuận Nam', 'Huyện Tuy Phong',
  ],
  'Đắk Lắk - Đắk Nông': [
    'TP. Buôn Ma Thuột', 'TX. Buôn Hồ',
    "Huyện Cư M'gar", 'Huyện Ea Súp', 'Huyện Krông Búk', 'Huyện Krông Pắc', 'Huyện Cư Kuin',
    'TP. Gia Nghĩa',
    "Huyện Đắk Mil", "Huyện Đắk R'Lấp", 'Huyện Krông Nô', 'Huyện Đắk Glong',
  ],
  'Gia Lai - Kon Tum': [
    'TP. Pleiku', 'TX. An Khê', 'TX. Ayun Pa',
    'Huyện Chư Sê', 'Huyện Chư Prông', 'Huyện Ia Grai', 'Huyện Đức Cơ', 'Huyện Mang Yang',
    'TP. Kon Tum',
    'Huyện Đắk Hà', 'Huyện Đắk Glei', 'Huyện Sa Thầy', 'Huyện Ngọc Hồi',
  ],
  'Tây Ninh - Bình Phước': [
    'TP. Tây Ninh',
    'Huyện Gò Dầu', 'Huyện Trảng Bàng', 'Huyện Dương Minh Châu', 'Huyện Châu Thành', 'Huyện Bến Cầu',
    'TP. Đồng Xoài', 'TX. Phước Long', 'TX. Bình Long',
    'Huyện Chơn Thành', 'Huyện Đồng Phú', 'Huyện Lộc Ninh', 'Huyện Bù Đốp', 'Huyện Hớn Quản',
  ],
  'Bình Dương - Long An - Tiền Giang': [
    'TP. Thủ Dầu Một', 'TP. Dĩ An', 'TP. Thuận An', 'TP. Bến Cát',
    'TX. Tân Uyên', 'Huyện Bắc Tân Uyên', 'Huyện Dầu Tiếng', 'Huyện Phú Giáo',
    'TP. Tân An', 'TX. Kiến Tường',
    'Huyện Đức Hòa', 'Huyện Bến Lức', 'Huyện Cần Giuộc', 'Huyện Thủ Thừa',
    'TP. Mỹ Tho', 'TX. Gò Công', 'TX. Cai Lậy',
    'Huyện Cái Bè', 'Huyện Châu Thành', 'Huyện Chợ Gạo', 'Huyện Gò Công Đông',
  ],
  'Đồng Nai - Bà Rịa - Vũng Tàu': [
    'TP. Biên Hòa', 'TP. Long Khánh',
    'Huyện Trảng Bom', 'Huyện Nhơn Trạch', 'Huyện Long Thành', 'Huyện Vĩnh Cửu', 'Huyện Định Quán',
    'TP. Vũng Tàu', 'TP. Bà Rịa', 'TX. Phú Mỹ',
    'Huyện Đất Đỏ', 'Huyện Long Điền', 'Huyện Châu Đức', 'Huyện Xuyên Mộc', 'Huyện Côn Đảo',
  ],
  'Bến Tre - Trà Vinh - Vĩnh Long': [
    'TP. Bến Tre',
    'Huyện Châu Thành', 'Huyện Chợ Lách', 'Huyện Giồng Trôm', 'Huyện Mỏ Cày Bắc', 'Huyện Mỏ Cày Nam',
    'TP. Trà Vinh',
    'Huyện Càng Long', 'Huyện Cầu Kè', 'Huyện Cầu Ngang', 'Huyện Tiểu Cần', 'Huyện Trà Cú',
    'TP. Vĩnh Long', 'TX. Bình Minh',
    'Huyện Long Hồ', 'Huyện Mang Thít', 'Huyện Trà Ôn', 'Huyện Vũng Liêm',
  ],
  'Đồng Tháp - An Giang': [
    'TP. Cao Lãnh', 'TP. Sa Đéc', 'TX. Hồng Ngự',
    'Huyện Tháp Mười', 'Huyện Tam Nông', 'Huyện Cao Lãnh', 'Huyện Lấp Vò', 'Huyện Lai Vung',
    'TP. Long Xuyên', 'TP. Châu Đốc', 'TX. Tân Châu',
    'Huyện An Phú', 'Huyện Châu Phú', 'Huyện Thoại Sơn', 'Huyện Châu Thành', 'Huyện Chợ Mới',
  ],
  'Kiên Giang': [
    'TP. Rạch Giá', 'TP. Phú Quốc', 'TX. Hà Tiên',
    'Huyện Châu Thành', 'Huyện Giang Thành', 'Huyện Giồng Riềng', 'Huyện Gò Quao',
    'Huyện Hòn Đất', 'Huyện Kiên Lương', 'Huyện Tân Hiệp', 'Huyện U Minh Thượng', 'Huyện An Biên',
  ],
  'Sóc Trăng - Bạc Liêu - Cà Mau': [
    'TP. Sóc Trăng', 'TX. Ngã Năm', 'TX. Vĩnh Châu',
    'Huyện Mỹ Xuyên', 'Huyện Châu Thành', 'Huyện Kế Sách', 'Huyện Long Phú',
    'TP. Bạc Liêu', 'TX. Giá Rai',
    'Huyện Đông Hải', 'Huyện Hòa Bình', 'Huyện Phước Long', 'Huyện Vĩnh Lợi',
    'TP. Cà Mau',
    'Huyện Thới Bình', 'Huyện U Minh', 'Huyện Trần Văn Thời', 'Huyện Năm Căn', 'Huyện Ngọc Hiển',
  ],
};

const PROVINCES = Object.keys(ADDRESS_DATA);

const STORAGE_OPTIONS = ['< 8GB', '8 GB', '16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB', '> 2 TB'];

const COLOR_OPTIONS = ['Bạc', 'Đen', 'Đen bóng - Jet black', 'Đỏ', 'Hồng', 'Trắng', 'Vàng', 'Vàng hồng', 'Xám', 'Xanh dương', 'Xanh lá', 'Tím', 'Cam', 'Màu khác'];

const ORIGIN_OPTIONS = ['Việt Nam', 'Ấn Độ', 'Hàn Quốc', 'Thái Lan', 'Nhật Bản', 'Trung Quốc', 'Mỹ', 'Đức', 'Đài Loan', 'Nước khác'];

const WARRANTY_OPTIONS = ['Hết bảo hành', '1 tháng', '2 tháng', '3 tháng', '4-6 tháng', '7-12 tháng', '>12 tháng', 'Còn bảo hành'];

export default function CreateListingPage() {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [aiResult, setAiResult] = useState<AiPricingData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    api.get<Category[]>('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'GOOD' },
  });

  const [customModel, setCustomModel] = useState('');
  const [hasAccessories, setHasAccessories] = useState<boolean | null>(null);
  const [accessoryItems, setAccessoryItems] = useState<string[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addrProvince, setAddrProvince] = useState('');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrWard, setAddrWard] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [showStreetInput, setShowStreetInput] = useState(false);
  const [addrSubmitTried, setAddrSubmitTried] = useState(false);

  const watchedBrand = watch('brand');
  const watchedModel = watch('model');
  const watchedLocation = watch('location');

  useEffect(() => {
    setValue('model', '');
    setCustomModel('');
  }, [watchedBrand, setValue]);

  const toggleAccessory = (item: string) => {
    setAccessoryItems((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      setValue('accessories', next.length > 0 ? next.join(', ') : undefined);
      return next;
    });
  };

  const handleAccessoryToggle = (value: boolean) => {
    setHasAccessories(value);
    if (!value) {
      setAccessoryItems([]);
      setValue('accessories', undefined);
    }
  };

  const handleAddressConfirm = () => {
    setAddrSubmitTried(true);
    if (!addrProvince || !addrDistrict || !addrWard) return;
    const parts = [addrStreet, addrWard, addrDistrict, addrProvince].filter(Boolean);
    setValue('location', parts.join(', '), { shouldValidate: true });
    setShowAddressModal(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newImages = [...images, ...files].slice(0, 10);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
    // Reset AI result khi ảnh thay đổi
    setAiResult(null);
    setAiError('');
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
    setAiResult(null);
  };

  const handleAiPricing = async () => {
    if (images.length === 0) {
      setAiError('Vui lòng tải lên ít nhất 1 ảnh để phân tích');
      return;
    }
    if (!watchedBrand || !watchedModel) {
      setAiError('Vui lòng điền Thương hiệu và Model trước khi định giá');
      return;
    }

    setIsAnalyzing(true);
    setAiError('');
    setAiResult(null);

    try {
      const formData = new FormData();
      formData.append('brand', watchedBrand);
      formData.append('model', watchedModel);
      images.forEach((img) => formData.append('images', img));

      const res = await api.post<AiPricingData>('/pricing/estimate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAiResult(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message;
      console.error('[AI Pricing Error]', status, msg, err);
      if (status === 401) {
        setAiError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
      } else if (status === 400) {
        setAiError(`Lỗi dữ liệu: ${msg ?? 'Kiểm tra ảnh và thông tin máy.'}`);
      } else {
        setAiError(`Định giá AI thất bại (${status ?? 'network'}). Vui lòng thử lại.`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUseAiPrice = (price: number) => {
    setValue('askingPrice', price, { shouldValidate: true });
    // Scroll xuống ô giá
    document.getElementById('askingPrice')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== '') formData.append(k, String(v));
      });
      images.forEach((img) => formData.append('images', img));

      const res = await api.post<Listing>('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Auto publish
      await api.patch(`/listings/${res.data.id}/publish`);
      router.push(`/listings/${res.data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (msg ?? 'Có lỗi xảy ra'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900 font-headline">Đăng tin bán máy</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Images */}
        <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">
            Ảnh sản phẩm <span className="text-gray-400 font-normal text-sm">(tối đa 10 ảnh)</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative h-24 w-24">
                <img src={src} alt="" className="h-full w-full rounded-lg object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-purple-200 text-slate-400 hover:border-primary hover:text-primary transition-colors">
                <Upload className="h-6 w-6" />
                <span className="mt-1 text-xs">Thêm ảnh</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        {/* Basic info */}
        <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 font-headline">Thông tin cơ bản</h2>

          <div>
            <Label htmlFor="title">Tiêu đề tin đăng</Label>
            <Input id="title" className="mt-1" placeholder="VD: iPhone 14 Pro Max 256GB Tím Nguyên Seal" {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <Label>Địa chỉ</Label>
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-left flex items-center gap-2 hover:border-primary/50 transition-colors"
            >
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <span className={watchedLocation ? 'text-slate-900 truncate' : 'text-slate-400'}>
                {watchedLocation ?? 'Chọn địa chỉ...'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Thương hiệu</Label>
              <select id="brand" className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('brand')}>
                <option value="">Chọn hãng</option>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.brand && <p className="mt-1 text-xs text-red-600">{errors.brand.message}</p>}
            </div>
            <div>
              <Label htmlFor="model">Model máy</Label>
              {watchedBrand && PHONE_MODELS[watchedBrand] ? (
                <>
                  <select
                    id="model"
                    className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                    {...register('model')}
                    onChange={(e) => {
                      setValue('model', e.target.value, { shouldValidate: true });
                      if (e.target.value !== 'Khác') setCustomModel('');
                    }}
                  >
                    <option value="">Chọn model</option>
                    {PHONE_MODELS[watchedBrand].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {watchedModel === 'Khác' && (
                    <Input
                      className="mt-2"
                      placeholder="Nhập tên model..."
                      value={customModel}
                      onChange={(e) => {
                        setCustomModel(e.target.value);
                        setValue('model', e.target.value || 'Khác', { shouldValidate: true });
                      }}
                    />
                  )}
                </>
              ) : (
                <Input id="model" className="mt-1" placeholder="VD: iPhone 14 Pro Max" {...register('model')} />
              )}
              {errors.model && <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>}
            </div>
          </div>

          {watchedBrand === 'Apple' && (
            <div>
              <Label>Phiên bản</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Quốc tế', 'Khoá mạng (lock)'].map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" value={v} {...register('iphoneVersion')} className="sr-only peer" />
                    <span className="rounded-full border border-purple-100 px-4 py-1.5 text-xs font-bold cursor-pointer peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:border-primary/40 transition-colors">
                      {v}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storage">Dung lượng</Label>
              <select id="storage" className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('storage')}>
                <option value="">Chọn dung lượng</option>
                {STORAGE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="color">Màu sắc</Label>
              <select id="color" className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('color')}>
                <option value="">Chọn màu sắc</option>
                {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">Xuất xứ</Label>
              <select id="origin" className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('origin')}>
                <option value="">Chọn xuất xứ</option>
                {ORIGIN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="warranty">Bảo hành</Label>
              <select id="warranty" className="mt-1 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" {...register('warranty')}>
                <option value="">Chọn bảo hành</option>
                {WARRANTY_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>


          {/* Phụ kiện */}
          <div>
            <Label>Phụ kiện kèm theo</Label>
            <div className="mt-2 flex gap-2">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => handleAccessoryToggle(val)}
                  className={`rounded-full border px-5 py-1.5 text-xs font-bold transition-colors ${
                    hasAccessories === val
                      ? 'border-primary bg-primary text-white'
                      : 'border-purple-100 text-slate-600 hover:border-primary/40'
                  }`}
                >
                  {val ? 'Có' : 'Không'}
                </button>
              ))}
            </div>
            {hasAccessories && (
              <div className="mt-3 flex gap-4">
                {['Củ sạc', 'Cáp sạc'].map((item) => (
                  <label key={item} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={accessoryItems.includes(item)}
                      onChange={() => toggleAccessory(item)}
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">{item}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>Tình trạng máy</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONDITIONS.map((c) => (
                <label key={c.value} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" value={c.value} {...register('condition')} className="sr-only peer" />
                  <span className="rounded-full border border-purple-100 px-3 py-1.5 text-xs font-bold cursor-pointer peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:border-primary/40 transition-colors">
                    {c.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* AI Pricing Section */}
          <div className="border-t border-dashed border-purple-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="askingPrice">Giá bán (VND)</Label>
                <p className="text-xs text-slate-400 mt-0.5">Dùng AI để gợi ý giá khách quan</p>
              </div>
              <button
                type="button"
                onClick={handleAiPricing}
                disabled={isAnalyzing}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isAnalyzing ? 'Đang phân tích...' : 'Định giá bằng AI'}
              </button>
            </div>

            <Input
              id="askingPrice"
              type="number"
              placeholder="VD: 25000000"
              {...register('askingPrice', { valueAsNumber: true })}
            />
            {errors.askingPrice && <p className="mt-1 text-xs text-red-600">{errors.askingPrice.message}</p>}

            {aiError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {aiError}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Mô tả chi tiết</Label>
            <textarea
              id="description"
              rows={5}
              className="mt-1 w-full rounded-xl border border-purple-100 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Mô tả tình trạng máy, phụ kiện kèm theo, lý do bán..."
              {...register('description')}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>
        </div>

        {/* AI Pricing Result */}
        {aiResult && (
          <AiPricingResult data={aiResult} onUsePrice={handleUseAiPrice} />
        )}

        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Đăng tin ngay
        </Button>
      </form>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
              <h2 className="text-base font-semibold text-slate-900">Chọn địa chỉ</h2>
              <div className="w-8" />
            </div>

            {/* Province */}
            <div className="mb-3">
              <select
                value={addrProvince}
                onChange={(e) => { setAddrProvince(e.target.value); setAddrDistrict(''); setAddrWard(''); }}
                className={`h-14 w-full rounded-2xl border px-4 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 transition-colors ${addrSubmitTried && !addrProvince ? 'border-red-400' : 'border-gray-200'} ${!addrProvince ? 'text-slate-400' : 'text-slate-900'}`}
              >
                <option value="">Tỉnh, thành phố *</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {addrSubmitTried && !addrProvince && <p className="mt-1 text-xs text-red-500">Vui lòng chọn</p>}
            </div>

            {/* District */}
            <div className="mb-3">
              <select
                value={addrDistrict}
                onChange={(e) => { setAddrDistrict(e.target.value); setAddrWard(''); }}
                disabled={!addrProvince}
                className={`h-14 w-full rounded-2xl border px-4 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${addrSubmitTried && !addrDistrict ? 'border-red-400' : 'border-gray-200'} ${!addrDistrict ? 'text-slate-400' : 'text-slate-900'}`}
              >
                <option value="">Quận, huyện, thị xã *</option>
                {addrProvince && ADDRESS_DATA[addrProvince]?.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {addrSubmitTried && !addrDistrict && <p className="mt-1 text-xs text-red-500">Vui lòng chọn</p>}
            </div>

            {/* Ward - text input */}
            <div className="mb-3">
              <input
                type="text"
                value={addrWard}
                onChange={(e) => setAddrWard(e.target.value)}
                disabled={!addrDistrict}
                placeholder="Phường, xã, thị trấn *"
                className={`h-14 w-full rounded-2xl border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed placeholder:text-slate-400 ${addrSubmitTried && !addrWard ? 'border-red-400' : 'border-gray-200'}`}
              />
              {addrSubmitTried && !addrWard && <p className="mt-1 text-xs text-red-500">Vui lòng chọn</p>}
            </div>

            {/* Street address - collapsible */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowStreetInput(!showStreetInput)}
                className="h-14 w-full rounded-2xl border border-gray-200 px-4 text-sm flex items-center justify-between text-slate-500 hover:border-gray-300 transition-colors"
              >
                <span className={addrStreet ? 'text-slate-900 truncate mr-2' : ''}>{addrStreet || 'Địa chỉ cụ thể'}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${showStreetInput ? 'rotate-180' : ''}`} />
              </button>
              {showStreetInput && (
                <input
                  type="text"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Số nhà, tên đường..."
                  className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 text-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              )}
            </div>

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleAddressConfirm}
              className="h-14 w-full rounded-2xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition-colors"
            >
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
