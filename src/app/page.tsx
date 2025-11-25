"use client"
import { supabaseClient } from '@/lib/supabaseClient'
import React, { useEffect, useMemo, useState } from 'react'
import Chart from './Chart'

const SUBJECTS = ['Math IA', 'Math 2B', 'Physics', 'Chemistry','Geography','EnR','EnL','Info']
const DEFAULT_FROM = '2025-11-07'

export default function GradesPage() {
  const [user, setUser] = useState<any | null>(null)
  const [from, setFrom] = useState<string>(DEFAULT_FROM)
  const [subject, setSubject] = useState<string>(SUBJECTS[0] ?? '')
  const [score, setScore] = useState<number>(40)
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
      console.error('Fetch error:', error)
      setLoading(false)
      return
    }

    setRows(data || [])
    setLoading(false)
  }

  async function addGrade(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      alert('ログインしてください')
      return
    }

    const payload = { date: selectedDate, subject, score, user_id: user.id }
    const { error } = await supabaseClient.from('grades').insert([payload])
    if (error) {
      console.error('Insert error:', error)
      alert('追加失敗: ' + error.message)
      return
    }
    fetchGrades()
  }

  async function saveEdit(id: number) {
    if (!user) {
      alert('ログインしてください')
      return
    }

    const { date, subject: s, score: sc } = editingFields
    
    // 日付を確実にYYYY-MM-DD形式にする
    const dateStr = date.split('T')[0]
    
    console.log('=== UPDATE DEBUG ===')
    console.log('User ID:', user.id)
    console.log('Row ID:', id)
    console.log('Update payload:', { date: dateStr, subject: s, score: sc })
    
    try {
      // まず現在のデータを取得
      const { data: currentData, error: fetchError } = await supabaseClient
        .from('grades')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        console.error('Fetch error:', fetchError)
        alert('データ取得エラー: ' + fetchError.message)
        return
      }
      
      console.log('Current data:', currentData)
      console.log('User owns this row?', currentData.user_id === user.id)
      
      // 削除して再挿入する方法を試す（回避策）
      const { error: deleteError } = await supabaseClient
        .from('grades')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
      
      if (deleteError) {
        console.error('Delete error:', deleteError)
        alert('削除エラー: ' + deleteError.message)
        return
      }
      
      // 新しいデータを挿入
      const { error: insertError } = await supabaseClient
        .from('grades')
        .insert([{ 
          date: dateStr, 
          subject: s, 
          score: sc, 
          user_id: user.id,
          inserted_at: currentData.inserted_at // 元の挿入時刻を保持
        }])
      
      if (insertError) {
        console.error('Insert error:', insertError)
        alert('挿入エラー: ' + insertError.message)
        return
      }
      
      console.log('Update completed via delete+insert')
      setEditingId(null)
      fetchGrades()
      
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('予期しないエラー: ' + String(err))
    }
  }

  function startEdit(row: any) {
    setEditingId(row.id)
    const dateStr = row.date?.split('T')[0] || row.date
    setEditingFields({ date: dateStr, subject: row.subject, score: row.score })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function deleteRow(id: number) {
    if (!confirm('削除しますか？')) return
    const { error } = await supabaseClient.from('grades').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      console.error('Delete error:', error)
      alert('削除失敗: ' + error.message)
      return
    }
    fetchGrades()
  }

  async function signUpWithEmail() {
    const { error } = await supabaseClient.auth.signUp({ email, password })
    if (error) {
      alert('登録失敗: ' + error.message)
      return
    }
    alert('登録完了。確認メールを確認してください。')
  }

  async function signInWithEmail() {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password })
    if (error) {
      alert('ログイン失敗: ' + error.message)
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
    // まず日付と教科の組み合わせでグループ化して、各グループ内で何番目かを特定
    const groups: Record<string, any[]> = {}
    
    for (const r of rows) {
      const d = r.date?.split('T')[0] || r.date
      const key = `${d}_${r.subject}`
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    
    // 各レコードに表示用の日付を割り当て
    const recordsWithDisplayDate: any[] = []
    for (const key in groups) {
      const records = groups[key]
      records.sort((a, b) => (a.inserted_at || '').localeCompare(b.inserted_at || ''))
      
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const d = r.date?.split('T')[0] || r.date
        const displayDate = i === 0 ? d : `${d} (${i + 1})`
        recordsWithDisplayDate.push({
          ...r,
          displayDate,
          _originalDate: d
        })
      }
    }
    
    // 表示用日付でグループ化し直す
    const dateMap: Record<string, any> = {}
    for (const r of recordsWithDisplayDate) {
      if (!dateMap[r.displayDate]) {
        dateMap[r.displayDate] = { 
          date: r.displayDate, 
          _originalDate: r._originalDate 
        }
        SUBJECTS.forEach(s => {
          dateMap[r.displayDate][s] = null
        })
      }
      dateMap[r.displayDate][r.subject] = r.score
    }
    
    // 日付順にソート
    return Object.values(dateMap).sort((a: any, b: any) => {
      const dateCompare = a._originalDate.localeCompare(b._originalDate)
      if (dateCompare !== 0) return dateCompare
      return a.date.localeCompare(b.date)
    })
  }, [rows])
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-medium">共テ成績管理</h1>
          
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">{user.email}</span>
              <button onClick={signOut} className="text-gray-700 hover:text-black">ログアウト</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="メール"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm px-2 py-1 border rounded w-40"
              />
              <input
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm px-2 py-1 border rounded w-32"
              />
              <button onClick={signInWithEmail} className="text-sm px-3 py-1 bg-black text-white rounded">ログイン</button>
              <button onClick={signUpWithEmail} className="text-sm px-3 py-1 border rounded">登録</button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Form */}
        {user && (
          <form onSubmit={addGrade} className="flex items-end gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">日付</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">科目</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-sm px-2 py-1 border rounded"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">点数</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                min="0"
                max="100"
                className="text-sm px-2 py-1 border rounded w-20"
              />
            </div>
            <button type="submit" className="text-sm px-4 py-1 bg-black text-white rounded">追加</button>
          </form>
        )}

        {/* Filter */}
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-600">表示:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-2 py-1 border rounded"
          />
          <span className="text-gray-600">以降</span>
        </div>

        {/* Chart */}
        <div className="border rounded p-4">
          <Chart data={chartData} subjects={SUBJECTS} />
        </div>

        {/* Table */}
        <div className="border rounded">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">読み込み中...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">データなし</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">日付</th>
                  <th className="px-3 py-2 text-left font-medium">科目</th>
                  <th className="px-3 py-2 text-left font-medium">点数</th>
                  <th className="px-3 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    {editingId === r.id ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={editingFields.date}
                            onChange={(e) => setEditingFields((p) => ({ ...p, date: e.target.value }))}
                            className="text-sm px-2 py-1 border rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editingFields.subject}
                            onChange={(e) => setEditingFields((p) => ({ ...p, subject: e.target.value }))}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            {SUBJECTS.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editingFields.score}
                            onChange={(e) => setEditingFields((p) => ({ ...p, score: Number(e.target.value) }))}
                            min="0"
                            max="100"
                            className="text-sm px-2 py-1 border rounded w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => saveEdit(r.id)} className="text-blue-600 hover:underline">保存</button>
                            <button onClick={cancelEdit} className="text-gray-600 hover:underline">戻る</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{r.date?.split('T')[0] || r.date}</td>
                        <td className="px-3 py-2">{r.subject}</td>
                        <td className="px-3 py-2">{r.score}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline">編集</button>
                            <button onClick={() => deleteRow(r.id)} className="text-red-600 hover:underline">削除</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
