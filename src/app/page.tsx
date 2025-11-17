"use client"
import { supabaseClient } from '@/lib/supabaseClient'
import { Check, LogIn, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
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

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingFields, setEditingFields] = useState<{ date: string; subject: string; score: number }>({
    date: new Date().toISOString().slice(0, 10),
    subject: SUBJECTS[0] ?? '',
    score: 0,
  })

  useEffect(() => {
    ;(async () => {
      const { data } = await supabaseClient.auth.getSession()
      setUser(data.session?.user ?? null)
    })()

    const { data: sub } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      try {
        sub.subscription.unsubscribe()
      } catch (e) {
        // ignore
      }
    }
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
      .select('id,date,subject,score,inserted_at')
      .eq('user_id', user.id)
      .gte('date', from)
      .order('date', { ascending: true })
      .order('inserted_at', { ascending: true })

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

    const payload = { date: selectedDate, subject, score, user_id: user.id }
    const { error } = await supabaseClient.from('grades').insert([payload])
    if (error) {
      console.error(error)
      alert('追加エラー: ' + error.message)
      return
    }
    fetchGrades()
  }

  async function saveEdit(id: number) {
    const { date, subject: s, score: sc } = editingFields
    
    // 日付フォーマットを確実にYYYY-MM-DD形式にする
    const formattedDate = date.includes('T') ? date.slice(0, 10) : date
    
    const { error } = await supabaseClient
      .from('grades')
      .update({ date: formattedDate, subject: s, score: sc })
      .eq('id', id)
      
    if (error) {
      console.error('Update error:', error)
      alert('更新エラー: ' + error.message)
      return
    }
    setEditingId(null)
    fetchGrades()
  }

  function startEdit(row: any) {
    setEditingId(row.id)
    const dateStr = row.date?.slice(0, 10) || row.date
    setEditingFields({ date: dateStr, subject: row.subject, score: row.score })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function deleteRow(id: number) {
    if (!confirm('この行を削除しますか？')) return
    const { error } = await supabaseClient.from('grades').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('削除エラー: ' + error.message)
      return
    }
    fetchGrades()
  }

  async function signUpWithEmail() {
    const { error } = await supabaseClient.auth.signUp({ email, password })
    if (error) {
      alert('サインアップ失敗: ' + error.message)
      return
    }
    alert('サインアップ成功。確認メールを確認してください。')
  }

  async function signInWithEmail() {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
    if (error) {
      alert('サインイン失敗: ' + error.message)
      return
    }
    setUser(data.session?.user ?? null)
  }

  async function signOut() {
    await supabaseClient.auth.signOut()
    setUser(null)
    setRows([])
  }

  const chartData = useMemo(() => {
    const map: Record<string, any> = {}
    for (const r of rows) {
      const d = r.date?.slice(0, 10) || r.date
      if (!map[d]) map[d] = { date: d }
      map[d][r.subject] = r.score
    }
    return Object.values(map).sort((a: any, b: any) => (a.date > b.date ? 1 : -1))
  }, [rows])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              共通テスト成績管理
            </h1>
            
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{user.email}</span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <LogOut size={16} />
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={signInWithEmail}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LogIn size={16} />
                  ログイン
                </button>
                <button
                  onClick={signUpWithEmail}
                  className="px-4 py-2 bg-white text-blue-600 text-sm border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  新規登録
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Add Grade Form */}
        {user && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">成績を追加</h2>
            <form onSubmit={addGrade} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">日付</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">科目</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-sm font-medium text-slate-700 mb-2">点数</label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={18} />
                追加
              </button>
            </form>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">表示期間:</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">以降のデータを表示</span>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">成績推移グラフ</h2>
          <Chart data={chartData} subjects={SUBJECTS} />
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">データ一覧</h2>
          {loading ? (
            <div className="text-center py-8 text-slate-600">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-slate-500">データがありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">日付</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">科目</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">点数</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      {editingId === r.id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={editingFields.date}
                              onChange={(e) => setEditingFields((p) => ({ ...p, date: e.target.value }))}
                              className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editingFields.subject}
                              onChange={(e) => setEditingFields((p) => ({ ...p, subject: e.target.value }))}
                              className="px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {SUBJECTS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editingFields.score}
                              onChange={(e) => setEditingFields((p) => ({ ...p, score: Number(e.target.value) }))}
                              min="0"
                              max="100"
                              className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => saveEdit(r.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="保存"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="キャンセル"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-slate-700">{r.date?.slice(0, 10) || r.date}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{r.subject}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.score}点</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => startEdit(r)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="編集"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => deleteRow(r.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="削除"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}