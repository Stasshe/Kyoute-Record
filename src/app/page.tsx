"use client"
import { supabaseClient } from '@/lib/supabaseClient'
import React, { useEffect, useState } from 'react'
import Chart from './Chart'

const SUBJECTS = ['Math IA', 'Math 2B', 'Physics', 'Chemistry']
const DEFAULT_FROM = '2025-11-07'

export default function GradesPage() {
  const [user, setUser] = useState<any | null>(null)
  const [from, setFrom] = useState<string>(DEFAULT_FROM)
  const [subject, setSubject] = useState<string>(SUBJECTS[0] ?? '')
  const [score, setScore] = useState<number>(80)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // initial session
    ;(async () => {
      const { data } = await supabaseClient.auth.getSession()
      setUser(data.session?.user ?? null)
    })()

    // listen to auth changes
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      // unsubscribe
      try {
        sub.subscription.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchGrades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, user])

  async function fetchGrades() {
    setLoading(true)
    if (!user) {
      setRows([])
      setLoading(false)
      return
    }

    const { data, error } = await supabaseClient
      .from('grades')
      .select('id,date,subject,score')
      .eq('user_id', user.id)
      .gte('date', from)
      .order('date', { ascending: true })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    setRows(data || [])
    setLoading(false)
  }

  async function addGrade(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert('サインインしてください')
      return
    }

    const payload = { date: new Date().toISOString().slice(0, 10), subject, score, user_id: user.id }
    const { error } = await supabaseClient.from('grades').insert([payload])
    if (error) {
      console.error(error)
      return
    }
    fetchGrades()
  }

  async function signInWithGoogle() {
    await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/grades' } })
  }

  async function signOut() {
    await supabaseClient.auth.signOut()
    setUser(null)
    setRows([])
  }

  // transform rows to chart series grouped by date
  const chartData = React.useMemo(() => {
    const map: Record<string, any> = {}
    for (const r of rows) {
      const d = r.date?.slice(0, 10) || r.date
      if (!map[d]) map[d] = { date: d }
      map[d][r.subject] = r.score
    }
    return Object.values(map).sort((a: any, b: any) => (a.date > b.date ? 1 : -1))
  }, [rows])

  return (
    <div className="min-h-screen p-6 bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">成績推移（個人用）</h1>

        <section className="mb-6">
          <label className="block text-sm mb-1">表示開始日</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </section>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {user ? (
              <div className="text-sm">こんにちは、{user.email}</div>
            ) : (
              <div className="text-sm text-slate-600">ログインしてください（Google）</div>
            )}
            <div>
              {user ? (
                <button onClick={signOut} className="text-sm text-slate-700 underline">
                  サインアウト
                </button>
              ) : (
                <button onClick={signInWithGoogle} className="bg-red-600 text-white px-3 py-1 rounded text-sm">
                  Google でログイン
                </button>
              )}
            </div>
          </div>

          <form onSubmit={addGrade} className="flex gap-2 items-end">
            <div>
              <label className="block text-sm mb-1">科目</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="border rounded px-2 py-1">
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">点数</label>
              <input type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-24 border rounded px-2 py-1" />
            </div>

            <div>
              <button className="bg-blue-600 text-white px-3 py-1 rounded" type="submit">
                追加（今日）
              </button>
            </div>
          </form>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-medium mb-2">チャート（{from} 以降）</h2>
          <Chart data={chartData} subjects={SUBJECTS} />
        </section>

        <section>
          <h3 className="text-md font-medium mb-2">生データ</h3>
          {loading ? (
            <div>読み込み中…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500">データがありません</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1">日付</th>
                  <th className="py-1">科目</th>
                  <th className="py-1">点数</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-1">{r.date?.slice(0, 10) || r.date}</td>
                    <td className="py-1">{r.subject}</td>
                    <td className="py-1">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
