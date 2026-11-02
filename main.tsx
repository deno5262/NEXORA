import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './AuthContext'
import Guard from './Guard'
import Shell from './Shell'
import Auth from './Auth'
import Home from './Home'
import Soon from './Soon'
import Settings from './Settings'
import Profile from './Profile'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<Auth mode="login" />} /><Route path="/signup" element={<Auth mode="signup" />} /><Route path="/reset" element={<Auth mode="reset" />} />
    <Route element={<Guard />}><Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="stories" element={<Soon title="Stories" phase={2} />} />
      <Route path="notifications" element={<Soon title="Notifications" phase={4} />} />
      <Route path="search" element={<Soon title="Search" phase={2} />} />
      <Route path="textora" element={<Soon title="TEXTORA" phase={3} note="Messaging module." />} />
      <Route path="create/post" element={<Soon title="Create Photo Post" phase={2} />} />
      <Route path="create/story" element={<Soon title="Create Story" phase={2} />} />
      <Route path="profile" element={<Profile />} />
      <Route path="settings/*" element={<Settings />} />
    </Route></Route>
  </Routes></AuthProvider></BrowserRouter></React.StrictMode>)
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
