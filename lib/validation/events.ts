import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title is too long"),
  description: z.string().optional(),
  start_time: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time",
  }),
  end_time: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid end time",
  }),
  location_name: z.string().min(3, "Location is required"),
  is_public: z.boolean().default(true),
  category: z.string().optional(),
  price: z.number().default(0),
});
