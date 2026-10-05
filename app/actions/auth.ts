"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = Object.fromEntries(formData.entries())

  const email = data.email as string
  const password = data.password as string
  const nextUrl = data.nextUrl as string || '/home'

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(nextUrl)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const data = Object.fromEntries(formData.entries())

  const email = data.email as string
  const password = data.password as string
  const fullName = data.fullName as string
  const username = data.username as string

  // We should ideally check if username exists here, but we will let Supabase handle it via triggers or handle the error

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      }
    }
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/verify')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
