import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  name: z.string().min(2, "Имя должно быть минимум 2 символа"),
  password: z.string().min(6, "Пароль должен быть минимум 6 символов"),
});

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export const tripSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  startDate: z.string().min(1, "Дата начала обязательна"),
  endDate: z.string().min(1, "Дата окончания обязательна"),
  currency: z.string().min(1, "Валюта обязательна"),
  totalBudget: z.string().optional(),
  countries: z.array(z.string()).min(1, "Минимум одна страна"),
  cities: z.array(z.string()).min(1, "Минимум один город"),
});

export const expenseSchema = z.object({
  paidByUserId: z.string().min(1),
  category: z.string().min(1, "Категория обязательна"),
  description: z.string().optional(),
  amount: z.string().min(1, "Сумма обязательна"),
  currency: z.string().min(1, "Валюта обязательна"),
  splitType: z.enum(["equal", "custom"]),
  receiptUrl: z.string().optional(),
  participantIds: z.array(z.string()).min(1, "Минимум один участник"),
  customAmounts: z.record(z.string(), z.string()).optional(),
});

export const profileSchema = z.object({
  displayName: z.string().min(1, "Имя обязательно"),
});
