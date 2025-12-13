"use client"
import { supabaseClient } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { Check, Key, LogIn, LogOut, User as UserIcon, X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  user: User | null
  setUser: (u: User | null) => void
  setRows: (r: any[]) => void
}

export default function AuthControls({ user, setUser, setRows }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

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

  return (
    <div className="flex items-center gap-3 text-sm">
      {user ? (
        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 border rounded bg-gray-50">
            <UserIcon size={16} className="text-gray-600" />
            <span className="text-gray-700">{user.email}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangePassword((s) => !s)}
              className="flex items-center gap-2 text-sm px-3 py-1 border rounded hover:bg-gray-100"
            >
              <Key size={14} />
              パスワード変更
            </button>

            <button onClick={signOut} className="flex items-center gap-2 text-sm px-3 py-1 border rounded hover:bg-gray-100">
              <LogOut size={14} />
              ログアウト
            </button>
          </div>

          {showChangePassword && (
            <div className="absolute right-0 top-12 bg-white border rounded p-3 shadow-md w-72 z-40">
              <div className="text-sm mb-2 flex items-center gap-2">
                <Key size={14} />
                新しいパスワードを入力
              </div>
              <input
                type="password"
                placeholder="新しいパスワード"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded mb-2"
              />
              <input
                type="password"
                placeholder="確認用パスワード"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full text-sm px-2 py-1 border rounded mb-3"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={async () => {
                    if (newPassword !== newPasswordConfirm) {
                      alert('パスワードが一致しません')
                      return
                    }
                    if (newPassword.length < 6) {
                      alert('パスワードは6文字以上にしてください')
                      return
                    }
                    try {
                      const { error } = await supabaseClient.auth.updateUser({ password: newPassword })
                      if (error) {
                        alert('変更失敗: ' + error.message)
                        return
                      }
                      alert('パスワードを変更しました')
                      setShowChangePassword(false)
                      setNewPassword('')
                      setNewPasswordConfirm('')
                    } catch (err) {
                      console.error(err)
                      alert('予期しないエラーが発生しました')
                    }
                  }}
                  className="flex items-center gap-2 text-sm px-3 py-1 bg-black text-white rounded"
                >
                  <Check size={14} />
                  変更
                </button>
                <button
                  onClick={() => {
                    setShowChangePassword(false)
                    setNewPassword('')
                    setNewPasswordConfirm('')
                  }}
                  className="flex items-center gap-2 text-sm px-3 py-1 border rounded"
                >
                  <X size={14} />
                  キャンセル
                </button>
              </div>
            </div>
          )}
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
          <button onClick={signInWithEmail} className="flex items-center gap-2 text-sm px-3 py-1 bg-black text-white rounded">
            <LogIn size={14} />
            ログイン
          </button>
          <button onClick={signUpWithEmail} className="text-sm px-3 py-1 border rounded">登録</button>
        </div>
      )}
    </div>
  )
}
