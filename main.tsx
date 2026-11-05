import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './AuthContext'
import Guard from './Guard'
import UpdateGate from './UpdateGate'
import Shell from './Shell'
import Auth from './Auth'
import Home from './Home'
import Soon from './Soon'
import Activity from './Activity'
import PostPage from './PostPage'
import Saved from './Saved'
import Stories from './Stories'
import StoryArchive from './StoryArchive'
import CreateStory from './CreateStory'
import Search from './Search'
import FollowList from './FollowList'
import Friends from './Friends'
import CreatePost from './CreatePost'
import Settings from './Settings'
import EditProfile from './EditProfile'
import Profile from './Profile'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><AuthProvider><UpdateGate /><Routes>
    <Route path="/login" element={<Auth mode="login" />} /><Route path="/signup" element={<Auth mode="signup" />} /><Route path="/reset" element={<Auth mode="reset" />} />
    <Route element={<Guard />}><Route element={<Shell />}>
      <Route index element={<Home />} />
      <Route path="stories" element={<Stories />} /><Route path="stories/archive" element={<StoryArchive />} />
      <Route path="notifications" element={<Navigate to="/activity" replace />} /><Route path="activity" element={<Activity />} /><Route path="post/:id" element={<PostPage />} /><Route path="saved" element={<Saved />} />
      <Route path="search" element={<Search />} /><Route path="friends" element={<Friends />} />
      <Route path="textora" element={<Soon title="TEXTORA" phase={3} note="Messaging module." />} />
      <Route path="create/post" element={<CreatePost />} />
      <Route path="create/story" element={<CreateStory />} />
      <Route path="profile" element={<Profile />} /><Route path="u/:username" element={<Profile />} /><Route path="u/:username/list/:kind" element={<FollowList />} />
      <Route path="settings/:section?" element={<Settings />} /><Route path="edit-profile" element={<EditProfile />} />
    </Route></Route>
  </Routes></AuthProvider></BrowserRouter></React.StrictMode>)
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))

setTimeout(() => { const s = document.getElementById('splash'); s?.classList.add('hide'); setTimeout(() => s?.remove(), 450) }, 1400)
