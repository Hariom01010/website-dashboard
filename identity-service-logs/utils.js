import {
  BORDER_COLOR,
  TYPE_NAME,
  BACKGROUND_COLOR,
  TYPE_DESCRIPTION,
} from './constants.js';

async function getIdentityLogs(query) {
  try {
    const identityLogsResponse = await fetch(`${API_BASE_URL}${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-type': 'application/json',
      },
    });

    const {
      data: identityLogs,
      next,
      prev,
    } = await identityLogsResponse.json();
    return { identityLogs, next, prev };
  } catch (error) {
    alert(`Error: ${error}`);
  }
}

function dateDiff(date1, date2, formatter) {
  if (date2 > date1) {
    return dateDiff(date2, date1, formatter);
  }

  const timeDifference = new Date(date1).getTime() - new Date(date2).getTime();

  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let res;
  if (seconds < 60) {
    res = `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  } else if (minutes < 60) {
    res = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else if (hours < 24) {
    res = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (days < 30) {
    res = `${days} ${days === 1 ? 'day' : 'days'}`;
  } else if (months < 12) {
    res = `${months} ${months === 1 ? 'month' : 'months'}`;
  } else {
    res = `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return formatter ? formatter(res) : res;
}

const fullDateString = (timestamp) => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-US', options).format(new Date(timestamp));
};

async function createCard({ username, identityLog, wrapper }) {
  let adminUserName = '';

  if (identityLog.type === 'PROFILE_DIFF_APPROVED') {
    const admin = await getUser(identityLog.meta.approvedBy);
    adminUserName = admin?.username || 'Unknown Admin';
  }

  if (identityLog.type === 'PROFILE_DIFF_REJECTED') {
    const admin = await getUser(identityLog.meta.rejectedBy);
    adminUserName = admin?.username || 'Unknown Admin';
  }

  const cardContainer = createCardComponent({
    className: 'cardDiv',
    tagName: 'div',
    parent: wrapper,
  });

  cardContainer.style.border = `2px solid ${BORDER_COLOR[identityLog.type]}`;
  cardContainer.style.backgroundColor = `${BACKGROUND_COLOR[identityLog.type]}`;

  createCardComponent({
    tagName: 'p',
    innerText: `${TYPE_NAME[identityLog.type]}`,
    className: 'typeContainer',
    parent: cardContainer,
  });

  createCardComponent({
    tagName: 'p',
    innerText: `${TYPE_DESCRIPTION[identityLog.type]({
      username,
      adminUserName,
      reason: identityLog.body?.message || '',
      profileDiffId: identityLog.body?.profileDiffId || '',
    })}`,
    className: 'cardDescription',
    parent: cardContainer,
  });

  const timePast = dateDiff(
    Date.now(),
    new Date(identityLog.timestamp._seconds * 1000),
    (d) => d + ' ago',
  );

  const dateRow = createCardComponent({
    tagName: 'div',
    className: 'dateRow',
    parent: cardContainer,
  });

  const dateContainer = createCardComponent({
    tagName: 'div',
    classNames: ['dateContainer', 'tooltip-container'],
    parent: dateRow,
  });

  createCardComponent({
    tagName: 'span',
    className: 'timestamp',
    innerText: timePast,
    parent: dateContainer,
  });

  createCardComponent({
    tagName: 'span',
    className: 'tooltip',
    innerText: fullDateString(identityLog.timestamp._seconds * 1000),
    parent: dateContainer,
  });
}

function createCardComponent({
  className,
  classNames,
  tagName,
  innerText,
  parent,
  child,
}) {
  const component = document.createElement(tagName);
  if (className) {
    component.classList.add(className);
  }

  if (classNames) {
    classNames.forEach((c) => component.classList.add(c));
  }

  if (innerText) {
    component.innerText = innerText;
  }

  if (parent) {
    parent.appendChild(component);
  }

  if (child) {
    component.appendChild(child);
  }

  return component;
}

async function getUserCount() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/identity-stats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-type': 'application/json',
      },
    });

    const usersStats = await res.json();
    return { ...usersStats };
  } catch (err) {
    console.error('Error in fetching user stats ' + err);
    return {
      verifiedUsersCount: 0,
      blockedUsersCount: 0,
      verifiedDeveloperCount: 0,
      blockedDeveloperCount: 0,
      developersLeftToVerifyCount: 0,
      developersCount: 0,
    };
  }
}

async function getSelfUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/self`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-type': 'application/json',
      },
    });

    const self_user = await res.json();
    if (self_user?.statusCode !== 200) {
      alert('You are not loggedin. Please login!');
      window.location.href = '/index.html';
    }
    return self_user;
  } catch (err) {
    console.error('Error in fetching self user ' + err);
    return {};
  }
}

const users = {};

async function getUser(userId) {
  if (users[userId]) {
    return users[userId];
  }
  const userResponse = await fetch(`${API_BASE_URL}/users?id=${userId}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-type': 'application/json',
    },
  });
  const { user } = await userResponse.json();
  users[userId] = user;
  return user;
}

async function fillData(identityLogs, next, prev) {
  if (identityLogs === undefined || identityLogs.length === 0) {
    document.getElementById('loader').innerHTML =
      'No Identity Service Logs found !!!';
  } else {
    const wrapper = createCardComponent({
      tagName: 'div',
      className: 'wrapperDiv',
    });

    const footerDiv = document.querySelector('#footer');
    document.body.insertBefore(wrapper, footerDiv);
    document.getElementById('loader').style.display = 'none';

    for (const identityLog of identityLogs) {
      try {
        const { userId } = identityLog.meta;
        const user = await getUser(userId);

        await createCard({
          username: user?.username || 'Unknown User',
          identityLog,
          wrapper,
        });
      } catch (error) {
        console.error(
          `Error processing log for userId ${identityLog.meta.userId}:`,
          error,
        );
      }
    }

    const buttonContainer = createCardComponent({
      tagName: 'div',
      className: 'buttonContainer',
      parent: wrapper,
    });

    if (prev) {
      const prevButton = createCardComponent({
        tagName: 'button',
        className: 'navigation-button',
        parent: buttonContainer,
        innerText: 'Prev',
      });

      prevButton.onclick = async () => {
        wrapper.remove();
        document.getElementById('loader').style.display = 'block';
        const {
          identityLogs,
          next,
          prev: prevLink,
        } = await getIdentityLogs(prev);
        fillData(identityLogs, next, prevLink);
      };
    }

    if (next) {
      const nextButton = createCardComponent({
        tagName: 'button',
        className: 'navigation-button',
        parent: buttonContainer,
        innerText: 'Next',
      });

      nextButton.onclick = async () => {
        wrapper.remove();
        document.getElementById('loader').style.display = 'block';
        const {
          identityLogs,
          next: nextLink,
          prev,
        } = await getIdentityLogs(next);
        fillData(identityLogs, nextLink, prev);
      };
    }
  }
}

export { getIdentityLogs, getSelfUser, fillData, getUserCount };
