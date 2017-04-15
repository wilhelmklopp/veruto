import React, { Component, PropTypes } from 'react';
import {
  StyleSheet,
  View,
  ListView,
  RefreshControl,
  Alert,
  AsyncStorage,
} from 'react-native';
import { connect } from 'react-redux';

import Room from './HomeScreen/Room';
import { sortRooms } from './HomeScreen/helpers';
import { updateRooms, updateUserPosition } from '../actions';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
    alignSelf: 'stretch',
  },
});

const MINUTES_FUTURE_KEY = '@Settings:minutes';

class HomeScreen extends Component {
  static propTypes = {
    navigator: PropTypes.any,
    freeRooms: PropTypes.array.isRequired,
    updateRooms: PropTypes.func.isRequired,
    userPosition: PropTypes.object.isRequired,
    updateUserPosition: PropTypes.func.isRequired,
  };

  static navigatorButtons = {
    rightButtons: [
      {
        title: 'Settings',
        id: 'settings',
      },
    ],
  };

  constructor(props) {
    super(props);
    this.updateLocation = this.updateLocation.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
    this.props.navigator.setOnNavigatorEvent(this.onNavigatorEvent.bind(this));

    this.state = {
      dataSource: new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 }),
      refreshing: false,
      initialLoad: true,
      minutesFuture: 30,
    };
  }

  componentDidMount() {
    this.updateLocation();
  }

  onNavigatorEvent(event) {
    switch (event.id) {
      case 'settings':
        this.props.navigator.showModal({
          title: 'Settings',
          screen: 'veruto.ModalSettingsScreen',
        });
        break;
      case 'didAppear':
        this.loadSettings().done();
        break;
      default:
        return;
    }
  }

  onRefresh() {
    this.setState({ refreshing: true });
    this.updateLocation();
    this.setState({ refreshing: false });
  }

  updateLocation() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(position);
        fetch(`http://localhost:5000/api/rooms.free?minutes=${this.state.minutesFuture}`)
        .then(response => response.json())
        .then(json => {
          const freeRooms = json.rooms;
          const rooms = sortRooms(freeRooms, position);

          this.setState({
            buttonActive: false,
            dataSource: this.state.dataSource.cloneWithRows(rooms),
          });
          this.props.updateRooms(rooms);
          this.props.updateUserPosition(position);
        })
       .catch(error => console.log(error));
      },
     (error) => Alert.alert(JSON.stringify(error)),
     { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }

  loadSettings = async () => {
    try {
      const value = await AsyncStorage.getItem(MINUTES_FUTURE_KEY);
      if (value !== null) {
        this.setState({ minutesFuture: value });
        console.log(`Recovered selection from disk: ${value}`);
      } else {
        console.log('Initialized with no selection on disk.');
      }
    } catch (error) {
      Alert.alert(`AsyncStorage error: ${error.message}`);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={(room) => <Room diary={`https://roombooking.ucl.ac.uk/rb/bookableSpace/roomDiary.html?room=${room.roomid}&building=${room.siteid}&invoker=EFD`} map={`http://maps.apple.com/?ll=<${room.location.coordinates.lat}>,<${room.location.coordinates.lng}>`} distance={room.distance}>{room.roomname}</Room>}
          initialListSize={100}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this.onRefresh}
            />
          }
        />
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  freeRooms: state.freeRooms,
  userPosition: state.userPosition,
});

const mapDispatchToProps = {
  updateRooms,
  updateUserPosition,
};

export default connect(mapStateToProps, mapDispatchToProps)(HomeScreen);
