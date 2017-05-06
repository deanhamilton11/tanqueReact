import { createAction } from 'redux-actions';
import * as ActionCable from 'actioncable/lib/assets/compiled/action_cable';

import { processMessage } from './message-processor';

export const ACTION_CABLE_CONNECT = 'ACTION_CABLE_CONNECT';
export const ACTION_CABLE_DISCONNECT = 'ACTION_CABLE_DISCONNECT';

export const ACTION_CABLE_CONNECTED = 'ACTION_CABLE_CONNECTED';
export const ACTION_CABLE_DISCONNECTED = 'ACTION_CABLE_DISCONNECTED';
export const ACTION_CABLE_REJECTED = 'ACTION_CABLE_REJECTED';
export const ACTION_CABLE_RECEIVED = 'ACTION_CABLE_RECEIVED';
export const ACTION_CABLE_SEND_MESSAGE = 'ACTION_CABLE_SEND_MESSAGE';


const RELAY_CHANNEL = 'MeshRelayChannel';

export const connect = createAction(ACTION_CABLE_CONNECT);
export const disconnect = createAction(ACTION_CABLE_DISCONNECT);
export const connected = createAction(ACTION_CABLE_CONNECTED);
export const disconnected = createAction(ACTION_CABLE_DISCONNECTED);
export const rejected = createAction(ACTION_CABLE_REJECTED);
export const received = createAction(ACTION_CABLE_RECEIVED);
export const sendMessage = createAction(ACTION_CABLE_SEND_MESSAGE);

function cableConnected(path, cable, dispatch) {
  return () => {
    dispatch(connected(cable));
  };
}

function cableDisconnected(dispatch) {
  return data => {
    dispatch(disconnected(data));
  };
}

function cableRejected(dispatch) {
  return data => {
    console.log('rejected', data);
    dispatch(rejected(data));
  };
}

function cableReceived(dispatch) {
  // data is the relay format:
  // {
  //   uid: uid,
  //   message: actual message
  // }
  return data => {
    dispatch(received({ data }));
    dispatch(processMessage(data));
  };
}

// data should already be encrypted
export function send(to, data) {
  return (dispatch, getState) => {
    dispatch(sendMessage({ to, data }));

    const state = getState();
    const { channel } = state.network.actionCable;

    channel.send({
      to, message: data, action: 'chat'
    });
  };
}

export function connectToCable() {
  return (dispatch, getState) => {
    const state = getState();
    if (state.network.actionCable.status === ACTION_CABLE_CONNECTED) {
      return;
    }
    dispatch(connect());

    const { uid, url } = state.identity.config;

    const path = `${url}?uid=${uid}`;

    const cable = ActionCable.createConsumer(path);
    cable.subscriptions.create({ channel: RELAY_CHANNEL }, {
      connected: cableConnected(path, cable, dispatch),
      disconnected: cableDisconnected(dispatch),
      rejected: cableRejected(dispatch),
      received: cableReceived(dispatch)
    });
  };
}
