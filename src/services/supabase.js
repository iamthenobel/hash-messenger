import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const avatarBucketId = import.meta.env.VITE_SUPABASE_AVATAR_BUCKET_ID || 'avatars'

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL in VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase anon key in VITE_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

export const signInWithEmail = (email, password) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signUpWithEmail = (email, password, options = {}) => {
  return supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: options.data || {},
      emailRedirectTo: `${window.location.origin}/login`,
    }
  })
}

export const getUser = () => supabase.auth.getUser()

export const getSession = () => supabase.auth.getSession()

export const signOut = () => supabase.auth.signOut()

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return user
}

// ============================================
// PROFILE FUNCTIONS (using 'profiles' table)
// ============================================

export const checkUsernameAvailability = async (username) => {
  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('check_username_availability', { check_username: username })
    
    if (!rpcError) {
      return rpcData || false
    }
    
    // Fallback to direct query
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.toLowerCase())
      .limit(1)

    if (error) {
      console.error('Username check error:', error)
      return true // Assume available on error
    }

    return !data || data.length === 0
  } catch (err) {
    console.error('Username check failed:', err)
    return true
  }
}

export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  } catch (err) {
    console.error('Get user profile error:', err)
    return null
  }
}

export const createUserProfile = async (profile) => {
  const profileData = {
    id: profile.id,
    full_name: profile.full_name || profile.fullName,
    username: (profile.username || '').toLowerCase(),
    email: (profile.email || '').toLowerCase(),
    dob: profile.dob,
    avatar: profile.avatar || '',
    status: profile.status || 'online',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Use upsert to handle conflicts
  const { data, error } = await supabase
    .from('profiles')
    .upsert([profileData], { onConflict: 'id' })
    .select()
    .single()

  return { data, error }
}

export const ensureUserProfile = async (user, metadata = {}) => {
  if (!user?.id) {
    throw new Error('Missing user id for profile creation')
  }

  // Check if profile already exists
  const existingProfile = await getUserProfile(user.id)
  if (existingProfile) {
    return { data: existingProfile, error: null }
  }

  // Create new profile
  const profileData = {
    id: user.id,
    full_name: metadata.fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || '',
    username: (metadata.username || user.user_metadata?.username || user.email?.split('@')[0] || user.id).toLowerCase(),
    email: user.email,
    dob: metadata.dob || user.user_metadata?.dob || null,
    avatar: metadata.avatar || user.user_metadata?.avatar || '',
    status: 'online',
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([profileData])
    .select()
    .single()

  return { data, error }
}

// ============================================
// AVATAR STORAGE FUNCTIONS
// ============================================

export const uploadAvatar = async (userId, file, contentType = file?.type || 'image/jpeg') => {
  try {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'image/avif': 'avif',
    }

    const fileExt = (file.name?.split('.').pop()?.toLowerCase() || mimeToExt[contentType] || 'jpg')
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(avatarBucketId)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from(avatarBucketId)
      .getPublicUrl(fileName)

    return publicUrl
  } catch (err) {
    console.error('Avatar upload error:', err)
    return '' // Return empty string on failure
  }
}

export const getAvatarUrl = (path) => {
  if (!path) return ''
  return supabase.storage.from(avatarBucketId).getPublicUrl(path).data.publicUrl
}

// ============================================
// CHAT FUNCTIONS
// ============================================

export const getUserChats = async (userId) => {
  try {
    // Get chat memberships for user
    const { data: memberships, error: membershipError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', userId)

    if (membershipError) throw membershipError

    if (!memberships || memberships.length === 0) {
      return []
    }

    const chatIds = memberships.map(m => m.chat_id)

    // Get chat details
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds)
      .order('last_message_at', { ascending: false })

    if (chatsError) throw chatsError

    return chats
  } catch (error) {
    console.error('Get user chats error:', error)
    return []
  }
}

export const getChatMembers = async (chatId) => {
  try {
    const { data, error } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('chat_id', chatId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Get chat members error:', error)
    return []
  }
}

export const getChatMessages = async (chatId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get chat messages error:', error)
    return []
  }
}

export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .neq('sender_id', userId)

    if (messagesError) throw messagesError
    if (!messages || messages.length === 0) return

    const messageIds = messages.map(msg => msg.id)

    const { data: existingReads, error: existingReadsError } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', userId)
      .in('message_id', messageIds)

    if (existingReadsError) throw existingReadsError

    const existingMessageIds = new Set((existingReads || []).map(item => item.message_id))
    const readsToInsert = messageIds
      .filter(messageId => !existingMessageIds.has(messageId))
      .map(messageId => ({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString(),
      }))

    if (readsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('message_reads')
        .upsert(readsToInsert, { onConflict: 'message_id,user_id' })

      if (insertError) throw insertError
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .in('id', messageIds)

    if (updateError) throw updateError
  } catch (error) {
    console.error('Mark messages as read error:', error)
  }
}

export const clearChatMessages = async (chatId) => {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId)

    if (error) throw error

    await supabase
      .from('chats')
      .update({
        last_message: null,
        last_sender_id: null,
        last_message_at: null,
      })
      .eq('id', chatId)

    return { success: true, error: null }
  } catch (error) {
    console.error('Clear chat messages error:', error)
    return { success: false, error }
  }
}

export const blockUser = async (userId, blockedUserId) => {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .upsert({
        blocker_id: userId,
        blocked_id: blockedUserId,
        created_at: new Date().toISOString(),
      }, { onConflict: 'blocker_id,blocked_id' })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('Block user error:', error)
    return { success: false, error }
  }
}

export const getBlockRelationship = async (userId, otherUserId) => {
  try {
    if (!userId || !otherUserId || userId === otherUserId) {
      return { blockedByMe: false, blockedByThem: false }
    }

    const { data: blockedByMeData, error: blockedByMeError } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', otherUserId)
      .maybeSingle()

    if (blockedByMeError) throw blockedByMeError

    const { data: blockedByThemData, error: blockedByThemError } = await supabase
      .from('user_blocks')
      .select('id')
      .eq('blocker_id', otherUserId)
      .eq('blocked_id', userId)
      .maybeSingle()

    if (blockedByThemError) throw blockedByThemError

    return {
      blockedByMe: Boolean(blockedByMeData),
      blockedByThem: Boolean(blockedByThemData),
    }
  } catch (error) {
    console.error('Get block relationship error:', error)
    return { blockedByMe: false, blockedByThem: false }
  }
}

export const unblockUser = async (userId, blockedUserId) => {
  try {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', blockedUserId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Unblock user error:', error)
    return { success: false, error }
  }
}

export const isUserBlocked = async (userId, otherUserId) => {
  try {
    if (!userId || !otherUserId || userId === otherUserId) return false

    const { data, error } = await supabase
      .from('user_blocks')
      .select('id')
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
      .maybeSingle()

    if (error) throw error
    return Boolean(data)
  } catch (error) {
    console.error('Check block status error:', error)
    return false
  }
}

export const deleteChatForUser = async (chatId, userId, otherUserId = null) => {
  try {
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)

    if (messagesError) throw messagesError

    const messageIds = (messages || []).map(item => item.id)

    if (messageIds.length > 0) {
      const { error: readsError } = await supabase
        .from('message_reads')
        .delete()
        .in('message_id', messageIds)

      if (readsError) throw readsError
    }

    const { error: messagesDeleteError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId)

    if (messagesDeleteError) throw messagesDeleteError

    const { error: chatMembersError } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)

    if (chatMembersError) throw chatMembersError

    const { error: chatsError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)

    if (chatsError) throw chatsError

    if (otherUserId) {
      const { error: requestsError } = await supabase
        .from('contact_requests')
        .delete()
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)

      if (requestsError) throw requestsError

      const { error: blocksError } = await supabase
        .from('user_blocks')
        .delete()
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)

      if (blocksError) throw blocksError
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Delete chat error:', error)
    return { success: false, error }
  }
}

export const archiveChat = async (chatId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_archives')
      .upsert({ chat_id: chatId, user_id: userId, archived_at: new Date().toISOString() })

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Archive chat error:', error)
    return { success: false, error }
  }
}

export const unarchiveChat = async (chatId, userId) => {
  try {
    const { error } = await supabase
      .from('chat_archives')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Unarchive chat error:', error)
    return { success: false, error }
  }
}

// ============================================
// CONTACT REQUEST FUNCTIONS
// ============================================

export const getPendingContactRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    const senderIds = [...new Set((data || []).map((request) => request.sender_id).filter(Boolean))]

    if (senderIds.length === 0) {
      return (data || []).map((request) => ({ ...request, sender: null }))
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar, email')
      .in('id', senderIds)

    if (profileError) throw profileError

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))

    return (data || []).map((request) => ({
      ...request,
      sender: profileMap.get(request.sender_id) || null,
    }))
  } catch (error) {
    console.error('Get pending contact requests error:', error)
    return []
  }
}

export const getSentContactRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error

    const recipientIds = [...new Set((data || []).map((request) => request.recipient_id).filter(Boolean))]

    if (recipientIds.length === 0) {
      return (data || []).map((request) => ({ ...request, recipient: null }))
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar, email')
      .in('id', recipientIds)

    if (profileError) throw profileError

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]))

    return (data || []).map((request) => ({
      ...request,
      recipient: profileMap.get(request.recipient_id) || null,
    }))
  } catch (error) {
    console.error('Get sent contact requests error:', error)
    return []
  }
}

export const acceptContactRequest = async (requestId, currentUserId, senderId) => {
  try {
    // Update request status
    const { error: updateError } = await supabase
      .from('contact_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (updateError) throw updateError

    // Create a new chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({ 
        created_by: currentUserId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (chatError) throw chatError

    // Add both users to chat members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: chat.id, user_id: currentUserId, joined_at: new Date().toISOString() },
        { chat_id: chat.id, user_id: senderId, joined_at: new Date().toISOString() }
      ])

    if (membersError) throw membersError

    return { success: true, chat, error: null }
  } catch (error) {
    console.error('Accept contact request error:', error)
    return { success: false, error }
  }
}

export const declineContactRequest = async (requestId) => {
  try {
    const { error } = await supabase
      .from('contact_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Decline contact request error:', error)
    return { success: false, error }
  }
}

export const sendContactRequest = async (senderId, recipientId) => {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Send contact request error:', error)
    return { data: null, error }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

export const searchUsers = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar, status')
    .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .limit(20)

  if (error) {
    console.error('Search users error:', error)
    return []
  }

  return data
}

export const broadcastChatEvent = async (chatId, message) => {
  if (!chatId || !message) return

  try {
    await fetch(import.meta.env.VITE_CHAT_WS_BROADCAST_URL || 'http://localhost:3001/api/chat-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        type: 'chat:update',
        message,
      }),
    })
  } catch (error) {
    console.warn('Broadcast chat event failed:', error)
  }
}

export const getUnreadCount = async (userId, chatId = null) => {
  try {
    let query = supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', userId)
    
    if (chatId) {
      query = query.eq('chat_id', chatId)
    }
    
    // Get messages not read by user
    const { count: totalMessages, error: countError } = await query

    if (countError) throw countError

    if (totalMessages === 0) return 0

    // Get read messages
    let readQuery = supabase
      .from('message_reads')
      .select('message_id', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    if (chatId) {
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
      
      if (messages && messages.length > 0) {
        readQuery = readQuery.in('message_id', messages.map(m => m.id))
      }
    }
    
    const { count: readCount } = await readQuery
    
    return (totalMessages || 0) - (readCount || 0)
  } catch (error) {
    console.error('Get unread count error:', error)
    return 0
  }
}

export const subscribeToMessages = (chatId, callback) => {
  return supabase
    .channel(`messages:${chatId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
}

export const subscribeToContactRequests = (userId, callback) => {
  return supabase
    .channel(`contact_requests:${userId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contact_requests',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()
}

// Chat-related functions for supabase.js

// Get chat details with contact info
export const getChatDetails = async (chatId, currentUserId) => {
  const { data: members, error: membersError } = await supabase
    .from('chat_members')
    .select('user_id')
    .eq('chat_id', chatId)

  if (membersError) throw membersError

  const otherMemberIds = (members || [])
    .map(member => member.user_id)
    .filter(userId => userId && userId !== currentUserId)

  if (otherMemberIds.length === 0) {
    return { contact: null }
  }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar, status')
    .in('id', otherMemberIds)

  if (profileError) throw profileError

  const contact = (profiles || [])[0] || null

  return { contact }
}

// Send a new message
export const sendMessage = async (chatId, senderId, message, replyToId = null) => {
  const { data: members, error: membersError } = await supabase
    .from('chat_members')
    .select('user_id')
    .eq('chat_id', chatId)

  if (membersError) throw membersError

  const otherMember = (members || []).find(member => member.user_id && member.user_id !== senderId)
  if (otherMember) {
    const blocked = await isUserBlocked(senderId, otherMember.user_id)
    if (blocked) {
      throw new Error('You cannot send messages to this contact because the chat is blocked.')
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      message: message,
      reply_to_id: replyToId,
    })
    .select()
    .single()

  if (error) throw error

  // Update chat's last message
  await supabase
    .from('chats')
    .update({
      last_message: message,
      last_sender_id: senderId,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', chatId)

  await broadcastChatEvent(chatId, data)

  return data
}

// Delete a message
export const deleteMessage = async (messageId, userId, deleteForAll = false) => {
  if (deleteForAll) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from('messages')
      .update({
        deleted: true,
        message: 'Message deleted',
        media_url: null,
        media_type: null,
        media_name: null,
        media_size: null,
        caption: null,
      })
      .eq('id', messageId)

    if (error) throw error
  }
}

// Update typing status
export const updateTypingStatus = async (chatId, userId, isTyping) => {
  const { error } = await supabase
    .from('chat_members')
    .update({ is_typing: isTyping, typing_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .eq('user_id', userId)

  if (error) throw error
}

// Subscribe to typing status
export const subscribeToTypingStatus = (chatId, currentUserId, callback) => {
  return supabase
    .channel(`typing:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_members',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        if (payload.new.user_id === currentUserId) return

        callback(Boolean(payload.new.is_typing))

        if (payload.new.is_typing) {
          setTimeout(() => callback(false), 3000)
        }
      }
    )
    .subscribe()
}

// Update email address
export const updateEmail = async (newEmail) => {
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail
  })
  
  if (error) throw error
  return data
}

// Update password
export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (error) throw error
  return data
}

// Delete user account (requires admin or confirmation)
export const deleteAccount = async (userId) => {
  // Note: This requires admin privileges or a Edge Function
  // For security, it's recommended to use a Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { userId }
  })
  
  if (error) throw error
  return data
}

// Upload chat media (image, video, document)
export const uploadChatMedia = async (chatId, userId, file, mediaType, onProgress) => {
  try {
    let bucketName
    switch (mediaType) {
      case 'image':
        bucketName = 'chat-images'
        break
      case 'video':
        bucketName = 'chat-videos'
        break
      case 'document':
        bucketName = 'chat-documents'
        break
      default:
        throw new Error('Invalid media type')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${chatId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    // Simulate progress (Supabase doesn't provide native progress)
    if (onProgress) {
      const interval = setInterval(() => {
        onProgress(Math.min(90, (Date.now() % 100)))
      }, 200)
      setTimeout(() => clearInterval(interval), 2000)
    }
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) throw error

    if (onProgress) onProgress(100)

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return {
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: mediaType
    }
  } catch (err) {
    console.error('Upload media error:', err)
    throw err
  }
}

// Send media message
export const sendMediaMessage = async (chatId, senderId, mediaData, mediaType, caption = '') => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      message: caption || '',
      media_url: mediaData.url,
      media_type: mediaType,
      media_name: mediaData.name,
      media_size: mediaData.size,
      caption: caption,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  // Update chat's last message
  await supabase
    .from('chats')
    .update({
      last_message: mediaType === 'image' ? '📷 Photo' : mediaType === 'video' ? '🎥 Video' : '📎 Document',
      last_sender_id: senderId,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', chatId)

  await broadcastChatEvent(chatId, data)

  return data
}

// Edit a message
export const editMessage = async (messageId, newMessage) => {
  const { data, error } = await supabase
    .from('messages')
    .update({
      message: newMessage,
      edited: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single()

  if (error) throw error
  return data
}
// Subscribe to read receipts for a chat
export const subscribeToReadReceipts = (chatId, currentUserId, callback) => {
  return supabase
    .channel(`read-receipts:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        // Only notify if the message was read by someone else
        if (payload.new.is_read && payload.new.sender_id === currentUserId) {
          callback(payload.new.id)
        }
      }
    )
    .subscribe()
}

export default supabase