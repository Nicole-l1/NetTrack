export const addFriend = (currentUserEmail, friendEmail) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
  
    const currentUser = users.find((user) => user.email === currentUserEmail);
    const friend = users.find((user) => user.email === friendEmail);
  
    if (currentUser && friend) {
      if (!currentUser.friends.includes(friendEmail)) {
        currentUser.friends.push(friendEmail);
      }
      localStorage.setItem('users', JSON.stringify(users));
      return true; 
    }
    return false;
  };
  
  export const getFriends = (currentUsername) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const currentUser = users.find((user) => user.username === currentUsername);
  
    if (!currentUser || !currentUser.friends) {
      console.error('Current user or friends list not found.');
      return [];
    }
  
    return currentUser.friends
      .map((friendUsername) => users.find((user) => user.username === friendUsername))
      .filter((friend) => friend !== undefined);
  };

  export const sendFriendRequest = (currentUsername, targetUsername) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
  
    const currentUser = users.find((user) => user.username === currentUsername);
    const targetUser = users.find((user) => user.username === targetUsername);
  
    if (!currentUser) {
      console.error(`Current user (${currentUsername}) not found.`);
      return false;
    }
  
    if (!targetUser) {
      console.error(`Target user (${targetUsername}) not found.`);
      return false; 
    }
  
    if (!targetUser.friendRequests) {
      targetUser.friendRequests = [];
    }
  
    if (!targetUser.friendRequests.includes(currentUsername)) {
      targetUser.friendRequests.push(currentUsername);
      localStorage.setItem('users', JSON.stringify(users));
      return true; 
    } else {
      console.warn(`Friend request already sent to ${targetUsername}.`);
      return false;
    }
  };
 
  export const removeFriend = (currentUsername, friendUsername) => {
    const users = JSON.parse(localStorage.getItem('users')) || [];
  
    const currentUser = users.find((user) => user.username === currentUsername);
    const friendUser = users.find((user) => user.username === friendUsername);
  
    if (!currentUser || !friendUser) {
      console.error('User not found for removal.');
      return false;
    }
    currentUser.friends = currentUser.friends.filter((username) => username !== friendUsername);
    friendUser.friends = friendUser.friends.filter((username) => username !== currentUsername);
    localStorage.setItem('users', JSON.stringify(users));
    return true; 
  };
  
  const users = JSON.parse(localStorage.getItem('users')) || [];


localStorage.setItem('users', JSON.stringify(users));

  