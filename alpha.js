
const csv = require('fast-csv');
const _ = require('lodash');
var fs = require('fs');
const { convertArrayToCSV } = require('convert-array-to-csv');
const x = 'd0db10bc-91b7-4a6c-9d35-d7a229187d60';
let dataStore = [];

// most popular room is calculated based on maximum number of visits by all users in total to the room. 
const getMostPopularRoomWhereXHasBeen = (xUserId) => {
  const userEvents = dataStore.filter(d => d.userId === xUserId);
  const groupedByRoom = _.groupBy(userEvents, (u) => u.roomId);
  const roomsWithVisitCount = [];
  Object.keys(groupedByRoom).forEach((roomId) =>
    roomsWithVisitCount.push({
      roomId,
      visitCount: groupedByRoom[roomId].length,
    }));

  return roomsWithVisitCount.sort((a, b) => b.visitCount - a.visitCount)[0].roomId;
};

// most popular user is calculated based on who shared the room most with other users
const getMostPopularUserWhoInteractsX = (xUserId) => {
  // This "usersWhoInteractedWithX" can be used for #3\s #2 as well but I calculate these two separately for isolation.
  const usersWhoInteractedWithX = getUsersWhoSharedRoomWithX(xUserId);
  const userWithInteractedUserCountList = [];
  usersWhoInteractedWithX.forEach(userId => userWithInteractedUserCountList.push({ userId, interactedWithUsersCount: getUsersWhoSharedRoomWithX(userId).length }));
  return userWithInteractedUserCountList.sort((a, b) => b.interactedWithUsersCount - a.interactedWithUsersCount)[0].userId;
};

const isRoomSharedWithX = (xEvent, otherUserEvent) => (
  (otherUserEvent.entryTime > xEvent.entryTime && xEvent.exitTime > otherUserEvent.entryTime) ||
  (otherUserEvent.entryTime > xEvent.entryTime && otherUserEvent.exitTime > xEvent.entryTime) ||
  (xEvent.entryTime > otherUserEvent.entryTime && otherUserEvent.exitTime > xEvent.entryTime) ||
  (xEvent.entryTime > otherUserEvent.entryTime && xEvent.exitTime > otherUserEvent.entryTime));

// assuming start/end time as X's first entry and last exit event time.
const getRoomsXHasBeen = (xUserId) => _.union(dataStore.filter(e => e.userId === xUserId).map(u => u.userId));

// assuming start/end time as X's first entry and last exit event time.
const getUsersWhoSharedRoomWithX = (xUerId) => {
  const xUserSortedEvents = dataStore.filter(e => e.userId === xUerId);
  // const xEventsGroupedByRoom = _.groupBy(xUserSortedEvents, a => a.roomId);
  // const roomsXHasBeen = Object.keys(xEventsGroupedByRoom);
  let usersSharedRoomWithX = [];
  xUserSortedEvents.forEach(xEvent => {
    const userIds = dataStore.filter(otherUserEvent =>
      otherUserEvent.userId !== xUerId && otherUserEvent.roomId === xEvent.roomId && isRoomSharedWithX(xEvent, otherUserEvent)
    ).map(a => a.userId);
    usersSharedRoomWithX.push(..._.union(userIds));
  });

  return _.union(usersSharedRoomWithX);
};

const getRequiredStats = (x) => {
  console.time("total process time")
  console.log(`user ​X (${x}) ​taken as input, following are as requested :`)
  console.time('process time for #1');
  console.log(`\t # 1 Most popular user who interact with ​X - ${getMostPopularUserWhoInteractsX(x)}`);
  console.timeEnd('process time for #1');
  console.time('process time for #2');
  console.log(`\t # 2 Most popular room where X has been - ${getMostPopularRoomWhereXHasBeen(x)}`);
  console.timeEnd('process time for #2');
  console.log('\t # 3 Between a start time and end time (considered as X\'s first entry and last exit)');
  console.time('process time for #3#1');
  console.log(`\t \t # 1 Rooms X has been to - ${getRoomsXHasBeen(x)}`);
  console.timeEnd('process time for #3#1');
  console.time('process time for #3#2');
  console.log(`\t \t # 2 Users who shared room with X - ${getUsersWhoSharedRoomWithX(x)}`);
  console.timeEnd('process time for #3#2');
  console.timeEnd("total process time");
};

const fillDataStore = () => {
  csv.fromPath('events.csv', { headers: true })
    .on('data', function (data) {
      if (data.entry_time && data.exit_time && data.Room && data.User) {
        const entryTime = parseInt(data.entry_time);
        const exitTime = parseInt(data.exit_time);
        dataStore.push({
          entryDateTime: new Date(entryTime),
          entryTime,
          exitDateTime: new Date(exitTime),
          exitTime,
          durationInMs: exitTime - entryTime,
          roomId: data.Room,
          userId: data.User,
        });
      }
    })
    .on('end', () => {
      dataStore = dataStore.sort((a, b) => a.entryTime - b.entryTime);
      console.log('data store is ready');      
      getRequiredStats(x);
      // // This code block was used to generate a new csv with data stored in dataStore object by reading the given csv file, to cross check results.

      // const csvFromArrayOfArrays = convertArrayToCSV(dataStore, {
      //   header: ['entryDateTime', 'entryTime', 'exitDateTime', 'exitTime', 'durationInMs', 'roomId', 'userId']
      // });

      // fs.writeFile("updatedEvent.csv", csvFromArrayOfArrays, (err) => {
      //   if (err) {
      //     return console.log(err);
      //   }

      //   console.log("The file was saved!");
    });
};



fillDataStore();

process.openStdin().addListener('data', () => { });