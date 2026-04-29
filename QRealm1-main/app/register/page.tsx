"use client"

import { useState, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/auth-provider"

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*\-–—+=()[\]{}|\\:;"'<>,./?`~])[A-Za-z\d!@#$%^&*\-–—+=()[\]{}|\\:;"'<>,./?`~]{8,}$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

const SPECIAL_CHARS = /[!@#$%^&*\-–—+=()[\]{}|\\:;"'<>,./?`~]/

function getPasswordStrength(password: string): { level: "weak" | "medium" | "strong"; score: number } {
  let score = 0
  if (password.length >= PASSWORD_MIN_LENGTH) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (SPECIAL_CHARS.test(password)) score++
  
  if (score < 4) return { level: "weak", score }
  if (score < 5) return { level: "medium", score }
  return { level: "strong", score }
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const { level, score } = getPasswordStrength(password)
  
  if (!password) return null
  
  const colors = {
    weak: "bg-red-500",
    medium: "bg-yellow-500",
    strong: "bg-green-500",
  }
  
  const labels = {
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
  }
  
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              score >= i * 2 ? colors[level] : "bg-gray-700"
            }`}
          />
        ))}
      </div>
      <p className={`mt-1 text-xs ${colors[level].replace("bg-", "text-")}`}>
        Password strength: {labels[level]}
      </p>
    </div>
  )
}

function validateEmail(email: string): string | null {
  if (!email) return "Email is required"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return "Invalid email format"
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required"
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  if (password.length > PASSWORD_MAX_LENGTH) return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`
  if (!/(?=.*[a-z])/.test(password)) return "Password must include at least one lowercase letter"
  if (!/(?=.*[A-Z])/.test(password)) return "Password must include at least one uppercase letter"
  if (!/(?=.*\d)/.test(password)) return "Password must include at least one number"
  if (!/(?=.*[!@#$%^&*\-–—+=()[\]{}|\\:;"'<>,./?`~])/.test(password)) return "Password must include at least one special character"
  return null
}

function RegistrationForm() {
  const router = useRouter()
  const { register } = useAuth()
  
  const [step, setStep] = useState<"basic" | "details">("basic")
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "STUDENT" as "STUDENT" | "RESEARCHER",
  })
  
  const [studentFields, setStudentFields] = useState({
    institution: "",
    course: "",
    yearOfStudy: "",
    studentId: "",
  })
  
  const [researcherFields, setResearcherFields] = useState({
    institution: "",
    fieldOfResearch: "",
    yearsOfExperience: "",
    researchProfile: "",
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  
  const validateBasicFields = useCallback(() => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.name)) {
      newErrors.name = "Name can only contain letters, spaces, hyphens, and apostrophes"
    }
    
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError
    
    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    
    return newErrors
  }, [formData])
  
  const validateDetailsFields = useCallback(() => {
    const newErrors: Record<string, string> = {}
    
    if (formData.userType === "STUDENT") {
      if (!studentFields.institution.trim()) {
        newErrors.institution = "University/College name is required"
      }
      if (!studentFields.course.trim()) {
        newErrors.course = "Course/Program is required"
      }
      if (!studentFields.yearOfStudy) {
        newErrors.yearOfStudy = "Year of study is required"
      }
      if (studentFields.studentId && studentFields.studentId.trim().length < 3) {
        newErrors.studentId = "Student ID must be at least 3 characters if provided"
      }
    } else {
      if (!researcherFields.institution.trim()) {
        newErrors.institution = "Institution name is required"
      }
      if (!researcherFields.fieldOfResearch.trim()) {
        newErrors.fieldOfResearch = "Field of research is required"
      }
      const years = parseInt(researcherFields.yearsOfExperience)
      if (isNaN(years) || years < 0) {
        newErrors.yearsOfExperience = "Years of experience must be 0 or greater"
      }
      if (researcherFields.researchProfile) {
        try {
          new URL(researcherFields.researchProfile)
        } catch {
          newErrors.researchProfile = "Must be a valid URL if provided"
        }
      }
    }
    
    return newErrors
  }, [formData.userType, studentFields, researcherFields])
  
  const handleBasicSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const basicErrors = validateBasicFields()
    
    if (Object.keys(basicErrors).length > 0) {
      setErrors(basicErrors)
      setTouched({
        name: true,
        email: true,
        password: true,
        confirmPassword: true,
      })
      return
    }
    
    setStep("details")
  }
  
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const detailErrors = validateDetailsFields()
    
    if (Object.keys(detailErrors).length > 0) {
      setErrors(detailErrors)
      return
    }
    
    setLoading(true)
    setApiError(null)
    
    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        userType: formData.userType,
        studentFields: formData.userType === "STUDENT" ? {
          institution: studentFields.institution.trim(),
          course: studentFields.course.trim(),
          yearOfStudy: studentFields.yearOfStudy,
          studentId: studentFields.studentId.trim() || undefined,
        } : undefined,
        researcherFields: formData.userType === "RESEARCHER" ? {
          institution: researcherFields.institution.trim(),
          fieldOfResearch: researcherFields.fieldOfResearch.trim(),
          yearsOfExperience: parseInt(researcherFields.yearsOfExperience),
          researchProfile: researcherFields.researchProfile.trim() || undefined,
        } : undefined,
      })
      
      // `register` from AuthProvider now returns ApiResult; guard for robustness.
      if (result?.success) {
        router.push(`/login?registered=true`)
      }
    } catch (err) {
      setApiError((err as Error).message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }
  
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const basicErrors = validateBasicFields()
    if (field in basicErrors) {
      setErrors((prev) => ({ ...prev, [field]: basicErrors[field] }))
    } else {
      setErrors((prev) => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }
  
  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        {step === "basic" ? "Create Account" : `${formData.userType === "STUDENT" ? "Student" : "Researcher"} Details`}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {step === "basic" 
          ? "Join the discourse with your account."
          : "Tell us a bit about yourself."}
      </p>
      
      {step === "basic" ? (
        <form onSubmit={handleBasicSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Full Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onBlur={() => handleBlur("name")}
              className="mt-2"
              placeholder="Dr. Jane Smith"
              required
            />
            {touched.name && errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onBlur={() => handleBlur("email")}
              className="mt-2"
              placeholder="jane.smith@university.edu"
              required
            />
            {touched.email && errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              User Type
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userType: "STUDENT" })}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                  formData.userType === "STUDENT"
                    ? "border-saffron-500 bg-saffron-500/20 text-saffron-300"
                    : "border-gray-700 text-muted-foreground hover:border-gray-600"
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, userType: "RESEARCHER" })}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                  formData.userType === "RESEARCHER"
                    ? "border-saffron-500 bg-saffron-500/20 text-saffron-300"
                    : "border-gray-700 text-muted-foreground hover:border-gray-600"
                }`}
              >
                PhD / Researcher
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onBlur={() => handleBlur("password")}
              className="mt-2"
              required
            />
            <PasswordStrengthIndicator password={formData.password} />
            {touched.password && errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>
          
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confirm Password
            </label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              onBlur={() => handleBlur("confirmPassword")}
              className="mt-2"
              required
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
            )}
          </div>
          
          {apiError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {apiError}
            </p>
          )}
          
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={handleDetailsSubmit} className="mt-8 space-y-4">
          {formData.userType === "STUDENT" ? (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  University/College Name *
                </label>
                <Input
                  value={studentFields.institution}
                  onChange={(e) => setStudentFields({ ...studentFields, institution: e.target.value })}
                  className="mt-2"
                  placeholder="Stanford University"
                  required
                />
                {errors.institution && (
                  <p className="mt-1 text-xs text-red-400">{errors.institution}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Course/Program *
                </label>
                <Input
                  value={studentFields.course}
                  onChange={(e) => setStudentFields({ ...studentFields, course: e.target.value })}
                  className="mt-2"
                  placeholder="Computer Science"
                  required
                />
                {errors.course && (
                  <p className="mt-1 text-xs text-red-400">{errors.course}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Year of Study *
                </label>
                <select
                  value={studentFields.yearOfStudy}
                  onChange={(e) => setStudentFields({ ...studentFields, yearOfStudy: e.target.value })}
                  className="mt-2 w-full rounded-lg border border-gray-700 bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select year</option>
                  {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map((year) => (
                    <option key={year} value={year}>{year} Year</option>
                  ))}
                </select>
                {errors.yearOfStudy && (
                  <p className="mt-1 text-xs text-red-400">{errors.yearOfStudy}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Student ID (Optional)
                </label>
                <Input
                  value={studentFields.studentId}
                  onChange={(e) => setStudentFields({ ...studentFields, studentId: e.target.value })}
                  className="mt-2"
                  placeholder="STU123456"
                />
                {errors.studentId && (
                  <p className="mt-1 text-xs text-red-400">{errors.studentId}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Institution Name *
                </label>
                <Input
                  value={researcherFields.institution}
                  onChange={(e) => setResearcherFields({ ...researcherFields, institution: e.target.value })}
                  className="mt-2"
                  placeholder="MIT"
                  required
                />
                {errors.institution && (
                  <p className="mt-1 text-xs text-red-400">{errors.institution}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Field of Research *
                </label>
                <Input
                  value={researcherFields.fieldOfResearch}
                  onChange={(e) => setResearcherFields({ ...researcherFields, fieldOfResearch: e.target.value })}
                  className="mt-2"
                  placeholder="Quantum Computing"
                  required
                />
                {errors.fieldOfResearch && (
                  <p className="mt-1 text-xs text-red-400">{errors.fieldOfResearch}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Years of Experience *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={researcherFields.yearsOfExperience}
                  onChange={(e) => setResearcherFields({ ...researcherFields, yearsOfExperience: e.target.value })}
                  className="mt-2"
                  placeholder="5"
                  required
                />
                {errors.yearsOfExperience && (
                  <p className="mt-1 text-xs text-red-400">{errors.yearsOfExperience}</p>
                )}
              </div>
              
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ORCID / Research Profile (Optional)
                </label>
                <Input
                  type="url"
                  value={researcherFields.researchProfile}
                  onChange={(e) => setResearcherFields({ ...researcherFields, researchProfile: e.target.value })}
                  className="mt-2"
                  placeholder="https://orcid.org/0000-0002-1825-0097"
                />
                {errors.researchProfile && (
                  <p className="mt-1 text-xs text-red-400">{errors.researchProfile}</p>
                )}
              </div>
            </>
          )}
          
          {apiError && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {apiError}
            </p>
          )}
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("basic")}
              className="flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      )}
      
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-saffron-400 hover:text-saffron-300">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center">Loading...</div>}>
      <RegistrationForm />
    </Suspense>
  )
}
