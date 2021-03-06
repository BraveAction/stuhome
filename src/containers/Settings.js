import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  Text,
  Image,
  AlertIOS,
  ScrollView,
  AsyncStorage
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
// import { ImageCache } from "react-native-img-cache";
import SettingItem from '../components/SettingItem';
import SettingSwitchItem from '../components/SettingSwitchItem';
import menus from '../constants/menus';
import mainStyles from '../styles/components/_Main';
import styles from '../styles/containers/_Settings';
import { getSettingsFromStorage, putSettingsToStorage } from '../actions/settingsAction';
import { resetAlerts } from '../actions/message/alertAction';

class Settings extends Component {
  static navigationOptions = {
    title: menus.settings.title
  }

  // clearCache() {
  //   AlertIOS.alert(
  //     '提示',
  //     '确定清理图片缓存？',
  //     [
  //       { text: '取消', style: 'cancel' },
  //       { text: '清除', onPress: () => ImageCache.get().clear().then(() => {
  //         AlertIOS.alert('提示', '清理成功');
  //       }) },
  //     ],
  //   );
  // }

  handleNotificationValueChange(value) {
    this.props.putSettingsToStorage({ enableNotification: value });
    // Clear message alters.
    this.props.resetAlerts();
  }

  handlePublishDialogValueChange(value) {
    this.props.putSettingsToStorage({ enablePublishDialog: value });
  }

  render() {
    let { settings } = this.props;

    return (
      <View style={[mainStyles.container, styles.container]}>
        {
          // <View style={styles.group}>
          //   <SettingItem
          //     text='清理缓存'
          //     onPress={() => this.clearCache()}/>
          // </View>
        }
        <View style={styles.group}>
          <SettingSwitchItem
            text='消息提醒'
            onValueChange={(value) => this.handleNotificationValueChange(value)}
            value={settings.enableNotification} />
        </View>
        <Text style={[styles.explanation, styles.text]}>
          开启“消息提醒”，每15s会自动获取“提到我的”、“回复”、“私信”，有新信息时会在首页左上角显示小红点，并在侧边栏显示未读消息数字。
        </Text>
        <View style={styles.group}>
          <SettingSwitchItem
            text='发帖确认提示'
            onValueChange={(value) => this.handlePublishDialogValueChange(value)}
            value={settings.enablePublishDialog} />
        </View>
        <Text style={[styles.explanation, styles.text]}>
          开启“发帖确认提示”，在发帖和回帖时，会弹出对话框确认是否发布，避免手误。
        </Text>
      </View>
    );
  }
}

function mapStateToProps({ settings }) {
  return {
    settings
  };
}

export default connect(mapStateToProps, {
  getSettingsFromStorage,
  putSettingsToStorage,
  resetAlerts
})(Settings);
