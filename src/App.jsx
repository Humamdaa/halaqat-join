import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'

function cleanError(error) {
  if (!error) return 'حدث خطأ غير متوقع.'
  const message = error.message ?? error.toString()

  if (message.includes('already registered')) return 'اسم المستخدم مستخدم مسبقاً.'
  if (message.includes('already have a pending')) return 'لديك طلب انضمام معلّق مسبقاً.'
  if (message.includes('Invalid or inactive')) return 'رابط الانضمام غير صالح أو تم إيقافه.'
  if (message.includes('Authentication required')) return 'تعذر التحقق من جلسة التسجيل. أعد المحاولة.'

  return message
}

function App() {
  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('token')?.trim() ?? ''
  }, [])

  const [loadingInvite, setLoadingInvite] = useState(true)
  const [invite, setInvite] = useState(null)
  const [fatalError, setFatalError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    password: '',
    fatherName: '',
    motherName: '',
    studentWhatsapp: '',
    parentWhatsapp: '',
    teacherWhatsapp: '',
  })

  useEffect(() => {
    async function resolveInvite() {
      if (!token) {
        setFatalError('رابط الانضمام لا يحتوي على رمز دعوة.')
        setLoadingInvite(false)
        return
      }

      try {
        const { data, error } = await supabase.rpc('resolve_join_link', {
          p_token: token,
        })

        if (error) throw error

        const link = Array.isArray(data) ? data[0] : data
        if (!link) throw new Error('Invalid or inactive join link')

        if (link.role !== 'student' && link.role !== 'teacher') {
          throw new Error('نوع رابط الانضمام غير مدعوم.')
        }

        setInvite(link)
      } catch (error) {
        setFatalError(cleanError(error))
      } finally {
        setLoadingInvite(false)
      }
    }

    resolveInvite()
  }, [token])

  function changeField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  function validate() {
    if (!form.fullName.trim()) return 'يرجى إدخال الاسم الكامل.'

    const username = form.username.trim().toLowerCase()
    if (!username) return 'يرجى إدخال اسم المستخدم.'

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return 'اسم المستخدم يجب أن يكون بين 3 و30 محرفاً، ويحتوي فقط على أحرف إنكليزية وأرقام و . _ -'
    }

    if (form.password.length < 6) return 'يجب أن تكون كلمة السر 6 محارف على الأقل.'
    if (!form.fatherName.trim()) return 'يرجى إدخال اسم الأب.'

    if (invite.role === 'student') {
      if (!form.motherName.trim()) return 'يرجى إدخال اسم الأم.'
      if (!form.parentWhatsapp.trim()) return 'يرجى إدخال واتساب أحد الوالدين.'
    }

    if (invite.role === 'teacher' && !form.teacherWhatsapp.trim()) {
      return 'يرجى إدخال واتساب الأستاذ.'
    }

    return null
  }

  async function submit(event) {
    event.preventDefault()
    setFormError('')

    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const username = form.username.trim().toLowerCase()
      const internalEmail = `${username}@halaqat.local`

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail,
        password: form.password,
        options: {
          data: {
            username,
            full_name: form.fullName.trim(),
          },
        },
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('تعذر إنشاء الحساب.')

      if (!authData.session) {
        throw new Error(
          'تم إنشاء الحساب ولكن Supabase ينتظر تأكيد البريد الإلكتروني. عطّل Confirm Email لأن النظام يستخدم halaqat.local.',
        )
      }

      const applicationData =
        invite.role === 'student'
          ? {
              father_name: form.fatherName.trim(),
              mother_name: form.motherName.trim(),
              student_whatsapp: form.studentWhatsapp.trim(),
              parent_whatsapp: form.parentWhatsapp.trim(),
            }
          : {
              father_name: form.fatherName.trim(),
              whatsapp: form.teacherWhatsapp.trim(),
            }

      const { error: requestError } = await supabase.rpc('submit_join_request', {
        p_token: token,
        p_application_data: applicationData,
      })

      if (requestError) throw requestError

      await supabase.auth.signOut()
      setSuccess(true)
    } catch (error) {
      console.error(error)
      setFormError(cleanError(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInvite) {
    return (
      <Page>
        <div className="state-card">
          <div className="spinner" />
          <h2>جارٍ التحقق من الرابط</h2>
          <p>يرجى الانتظار...</p>
        </div>
      </Page>
    )
  }

  if (fatalError || !invite) {
    return (
      <Page>
        <div className="state-card error-state">
          <div className="state-icon">⚠</div>
          <h2>رابط غير صالح</h2>
          <p>{fatalError || 'تعذر قراءة رابط الانضمام.'}</p>
        </div>
      </Page>
    )
  }

  if (success) {
    return (
      <Page>
        <div className="state-card success-state">
          <div className="state-icon">✓</div>
          <h2>تم إرسال طلبك</h2>
          <p>
            تم إرسال طلب الانضمام إلى مشرف <strong>{invite.mosque_name}</strong>.
          </p>
          <p>
            بعد موافقة المشرف يمكنك تسجيل الدخول من تطبيق حلقات باستخدام اسم المستخدم وكلمة السر التي اخترتها.
          </p>
        </div>
      </Page>
    )
  }

  const isStudent = invite.role === 'student'

  return (
    <Page>
      <main className="join-card">
        <div className="brand">
          <div className="brand-icon">☾</div>
          <div>
            <h1>حلقات</h1>
            <p>نظام إدارة حلقات القرآن الكريم</p>
          </div>
        </div>

        <section className="invite-box">
          <span className="small-label">طلب الانضمام إلى</span>
          <h2>{invite.mosque_name}</h2>
          <div className="role-chip">{isStudent ? 'طالب' : 'أستاذ'}</div>
        </section>

        <form onSubmit={submit}>
          <Field
            label="الاسم الكامل"
            value={form.fullName}
            onChange={(value) => changeField('fullName', value)}
            autoComplete="name"
          />

          <Field
            label="اسم المستخدم"
            value={form.username}
            onChange={(value) => changeField('username', value)}
            dir="ltr"
            placeholder="مثال: ahmad123"
            autoComplete="username"
          />

          <Field
            label="كلمة السر"
            type="password"
            value={form.password}
            onChange={(value) => changeField('password', value)}
            dir="ltr"
            autoComplete="new-password"
          />

          <Field
            label="اسم الأب"
            value={form.fatherName}
            onChange={(value) => changeField('fatherName', value)}
          />

          {isStudent ? (
            <>
              <Field
                label="اسم الأم"
                value={form.motherName}
                onChange={(value) => changeField('motherName', value)}
              />

              <Field
                label="واتساب الطالب (اختياري)"
                value={form.studentWhatsapp}
                onChange={(value) => changeField('studentWhatsapp', value)}
                dir="ltr"
                inputMode="tel"
                placeholder="+963..."
              />

              <Field
                label="واتساب أحد الوالدين"
                value={form.parentWhatsapp}
                onChange={(value) => changeField('parentWhatsapp', value)}
                dir="ltr"
                inputMode="tel"
                placeholder="+963..."
              />
            </>
          ) : (
            <Field
              label="واتساب الأستاذ"
              value={form.teacherWhatsapp}
              onChange={(value) => changeField('teacherWhatsapp', value)}
              dir="ltr"
              inputMode="tel"
              placeholder="+963..."
            />
          )}

          {formError && <div className="form-error">{formError}</div>}

          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? 'جارٍ إرسال الطلب...' : 'إرسال طلب الانضمام'}
          </button>
        </form>

        <p className="privacy-note">يتم استخدام بياناتك فقط لإدارة طلب انضمامك إلى الحلقة.</p>
      </main>
    </Page>
  )
}

function Page({ children }) {
  return <div className="page">{children}</div>
}

function Field({ label, value, onChange, type = 'text', dir = 'rtl', ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  )
}

export default App
