// controllers/friendController.js
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to get socket ID (assuming io is passed or accessible)
const getSocketIdByUserId = (io, userId) => {
    const onlineUsers = io?.sockets?.server?.settings?.onlineUsers || {}; // Access onlineUsers if stored on server settings or pass io differently
    return onlineUsers[userId]?.socketId;
};

// Send Friend Request
exports.sendFriendRequest = async (req, res, io) => { // Pass io instance
    const senderId = req.user.id;
    const recipientId = req.params.userId;

    if (senderId === recipientId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    try {
        const sender = await User.findById(senderId);
        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({ message: "Recipient user not found" });
        }

        // Check if already friends or request pending/sent
        const existingSenderRelation = sender.friends.find(f => f.userId.equals(recipientId));
        const existingRecipientRelation = recipient.friends.find(f => f.userId.equals(senderId));

        if (existingSenderRelation || existingRecipientRelation) {
            let message = "Friendship status already exists: ";
            if (existingSenderRelation?.status === 'accepted') message += "Already friends.";
            else if (existingSenderRelation?.status === 'requested') message += "Request already sent.";
            else if (existingSenderRelation?.status === 'pending') message += "They already sent you a request.";
            else if (existingRecipientRelation?.status === 'pending') message += "Request already sent."; // Check other user too
            else if (existingRecipientRelation?.status === 'requested') message += "They already sent you a request.";
            else message = "Cannot process request due to existing relationship."
            return res.status(400).json({ message });
        }

        // Add 'requested' to sender's list
        sender.friends.push({ userId: recipientId, status: 'requested' });
        await sender.save();

        // Add 'pending' to recipient's list
        recipient.friends.push({ userId: senderId, status: 'pending' });
        await recipient.save();

        // Notify recipient via Socket.IO if online
        const recipientSocketId = getSocketIdByUserId(io, recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('friend_request_received', {
                senderId: senderId,
                senderName: sender.name,
                senderPlayerId: sender.playerId
            });
            console.log(`Emitted friend_request_received to ${recipient.name} (${recipientSocketId})`);
        } else {
             console.log(`Recipient ${recipient.name} is offline. Request saved.`);
        }


        res.status(200).json({ message: "Friend request sent successfully" });

    } catch (err) {
        console.error("Error sending friend request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Accept Friend Request
exports.acceptFriendRequest = async (req, res, io) => {
    const acceptorId = req.user.id; // The one accepting the request
    const requesterId = req.params.userId; // The one who sent the request

    try {
        const acceptor = await User.findById(acceptorId);
        const requester = await User.findById(requesterId);

        if (!requester) {
            return res.status(404).json({ message: "Requester user not found" });
        }

        // Find and update the status in both users' friend lists
        const acceptorFriendIndex = acceptor.friends.findIndex(f => f.userId.equals(requesterId) && f.status === 'pending');
        const requesterFriendIndex = requester.friends.findIndex(f => f.userId.equals(acceptorId) && f.status === 'requested');

        if (acceptorFriendIndex === -1 || requesterFriendIndex === -1) {
            return res.status(400).json({ message: "No matching friend request found to accept" });
        }

        acceptor.friends[acceptorFriendIndex].status = 'accepted';
        requester.friends[requesterFriendIndex].status = 'accepted';

        await acceptor.save();
        await requester.save();

         // Notify original requester via Socket.IO if online
        const requesterSocketId = getSocketIdByUserId(io, requesterId);
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('friend_request_accepted', {
                acceptorId: acceptorId,
                acceptorName: acceptor.name,
                acceptorPlayerId: acceptor.playerId
            });
             console.log(`Emitted friend_request_accepted to ${requester.name} (${requesterSocketId})`);
        } else {
             console.log(`Requester ${requester.name} is offline. Acceptance saved.`);
        }

        res.status(200).json({ message: "Friend request accepted" });

    } catch (err) {
        console.error("Error accepting friend request:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Reject / Cancel / Remove Friend
exports.removeFriend = async (req, res, io) => {
    const actorId = req.user.id; // The user initiating the removal/rejection
    const targetId = req.params.userId; // The user being removed/rejected

     if (actorId === targetId) {
        return res.status(400).json({ message: "Cannot remove yourself" });
    }

    try {
        const actor = await User.findById(actorId);
        const target = await User.findById(targetId);

         if (!target) {
            // Still proceed to remove from actor's list if target doesn't exist
            await User.updateOne(
                { _id: actorId },
                { $pull: { friends: { userId: targetId } } }
            );
             console.log(`Target user ${targetId} not found, removed from actor ${actorId}'s list.`);
             return res.status(200).json({ message: "Friendship entry removed (target not found)" });
        }

        // Determine original status for notification purposes
        const actorRelation = actor.friends.find(f => f.userId.equals(targetId));
        const wasPending = actorRelation?.status === 'pending'; // Was actor rejecting?
        const wasRequested = actorRelation?.status === 'requested'; // Was actor cancelling?
        const wereFriends = actorRelation?.status === 'accepted'; // Was actor unfriending?


        // Remove entry from both users' lists regardless of status
        await User.updateOne(
            { _id: actorId },
            { $pull: { friends: { userId: targetId } } }
        );
         await User.updateOne(
            { _id: targetId },
            { $pull: { friends: { userId: actorId } } }
        );

        // Notify the other user (target) if appropriate action occurred (e.g., rejection)
        const targetSocketId = getSocketIdByUserId(io, targetId);
        if (targetSocketId) {
             if (wasPending) { // Actor rejected a request from target
                io.to(targetSocketId).emit('friend_request_rejected', {
                    rejectorId: actorId,
                    rejectorName: actor.name,
                });
                console.log(`Emitted friend_request_rejected to ${target.name} (${targetSocketId})`);
            } else if (wereFriends) { // Actor unfriended target
                 io.to(targetSocketId).emit('friend_removed', {
                    removerId: actorId,
                    removerName: actor.name,
                });
                console.log(`Emitted friend_removed to ${target.name} (${targetSocketId})`);
            } else if (wasRequested) {
                // Optionally notify if cancellation happened, but often not necessary
                 console.log(`Actor ${actor.name} cancelled request to ${target.name}. No notification sent.`);
            }
        } else {
             console.log(`Target ${target.name} is offline. Removal/rejection saved.`);
        }

        let message = "Friendship entry removed";
        if(wasPending) message = "Friend request rejected";
        if(wasRequested) message = "Friend request cancelled";
        if(wereFriends) message = "Friend removed successfully";

        res.status(200).json({ message });

    } catch (err) {
        console.error("Error removing friend entry:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get Friends List (including pending/requested)
exports.getFriendsList = async (req, res) => {
    const userId = req.user.id;

    try {
        const user = await User.findById(userId)
            .populate('friends.userId', 'name playerId email'); // Populate friend details

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Optionally add online status here if needed immediately
         const onlineUsersMap = req.app.get('onlineUsers') || {}; // Get online users map

         const friendsWithStatus = user.friends.map(friendship => {
             if (!friendship.userId) { // Handle potential null population if friend was deleted
                 return null;
             }
             return {
                _id: friendship.userId._id,
                name: friendship.userId.name,
                playerId: friendship.userId.playerId,
                // email: friendship.userId.email, // Maybe don't expose email in friends list
                status: friendship.status, // 'pending', 'requested', 'accepted'
                isOnline: !!onlineUsersMap[friendship.userId._id.toString()] // Check if friend ID is in online map
             };
         }).filter(f => f !== null); // Filter out null entries


        res.status(200).json(friendsWithStatus);

    } catch (err) {
        console.error("Error fetching friends list:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


// Get User Profile (including friendship status relative to requester)
exports.getUserProfile = async (req, res) => {
    const viewerId = req.user.id;
    const profileOwnerId = req.params.userId;

    try {
        const profileOwner = await User.findById(profileOwnerId)
                                        .select('-password -friends'); // Exclude password and full friends list

        if (!profileOwner) {
            return res.status(404).json({ message: "User profile not found" });
        }

         // Determine friendship status
        let friendshipStatus = 'none'; // Default: not friends
         const viewer = await User.findById(viewerId).select('friends'); // Get only friends array of viewer
         if (viewer) {
             const relationship = viewer.friends.find(f => f.userId.equals(profileOwnerId));
             if (relationship) {
                 // Convert internal status to status relative to viewer
                 switch (relationship.status) {
                     case 'accepted': friendshipStatus = 'friends'; break;
                     case 'requested': friendshipStatus = 'request_sent'; break; // Viewer sent request
                     case 'pending': friendshipStatus = 'request_received'; break; // Viewer received request
                 }
             }
         }


        res.status(200).json({
            _id: profileOwner._id,
            name: profileOwner.name,
            playerId: profileOwner.playerId,
            wins: profileOwner.wins,
            losses: profileOwner.losses,
            draws: profileOwner.draws,
            rating: profileOwner.rating,
            totalGamesPlayed: profileOwner.totalGamesPlayed,
            createdAt: profileOwner.createdAt, // Optional: show join date
            friendshipStatus: friendshipStatus // 'none', 'friends', 'request_sent', 'request_received'
        });

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};