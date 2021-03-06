import React, { Component } from 'react';
import { connect } from 'react-redux';
import {
  View,
  Text,
  Linking,
  AlertIOS,
  ScrollView,
  ActivityIndicator,
  TouchableHighlight,
  FlatList,
  ActionSheetIOS,
  Clipboard
} from 'react-native';
import _ from 'lodash';
import { NavigationActions } from 'react-navigation';
import { TOPIC_URL_ROOT } from '../config';
import Avatar from '../components/Avatar';
import Icon from 'react-native-vector-icons/FontAwesome';
import moment from 'moment';
import mainStyles from '../styles/components/_Main';
import headerRightButtonStyles from '../styles/components/button/_HeaderRightButton';
import indicatorStyles from '../styles/common/_Indicator';
import modalStyles from '../styles/common/_Modal';
import styles from '../styles/containers/_TopicDetail';
import ReplyModal from '../components/modal/ReplyModal';
import Comment from '../components/Comment';
import Content from '../components/Content';
import VoteList from '../components/VoteList';
import RewardList from '../components/RewardList';
import MessageBar from '../services/MessageBar';
import colors from '../styles/common/_colors';
import api from '../services/api';
import { parseContentWithEmoji } from '../utils/contentParser';
import {
  fetchTopic,
  resetTopic
} from '../actions/topic/topicAction';

const resetAction = NavigationActions.reset({
  index: 0,
  actions: [
    NavigationActions.navigate({ routeName: 'Home' })
  ]
});

function getTopicId(topic) {
  if (!topic) { return null; }

  // For `hot(今日热门)` tab in Home page, each topic has
  // not `topic_id` field, but they have `source_id` and
  // `source_type` instead.
  if (topic.source_id) { return topic.source_id; }

  return topic.topic_id;
}

class TopicDetail extends Component {
  static navigationOptions = ({ navigation }) => {
    let { headerTitle, isLogin, handleShowOperationDialog } = navigation.state.params;
    return {
      title: headerTitle,
      headerRight: (
        isLogin &&
          <Icon
            style={headerRightButtonStyles.button}
            size={24}
            name='ellipsis-h'
            onPress={handleShowOperationDialog} />
      )
    };
  }

  constructor(props) {
    super(props);

    let { params } = props.navigation.state;
    this.topicId = getTopicId(params);
    this.boardId = params.board_id;
    this.boardName = params.board_name;
    // `sourceWebUrl` could only be fetched in topic list,
    // in other cases, we need to get web url manually.
    this.sourceWebUrl = params.sourceWebUrl || `${TOPIC_URL_ROOT}&tid=${this.topicId}`;

    this.authorId = 0;
    this.order = 0;

    this.state = {
      isFavoring: false,
      isVoting: false
    };
  }

  componentDidMount() {
    // Set up header.
    this.props.navigation.setParams({
      // Use `headerTitle` here to avoid treating topic title
      // as screen header title.
      headerTitle: this.boardName,
      isLogin: !!this.props.user.authrization.token,
      handleShowOperationDialog: () => this.showOperationDialog()
    });
    this.fetchTopic();
  }

  componentWillUnmount() {
    this.props.resetTopic({ topicId: this.topicId });
  }

  componentWillReceiveProps(nextProps) {
    let { topicItem } = nextProps;

    if (topicItem.errCode) {
      AlertIOS.alert('提示', topicItem.errCode);
      nextProps.resetTopic({ topicId: this.topicId });
      nextProps.navigation.goBack();
      return;
    }
  }

  fetchTopic(fields) {
    this.props.fetchTopic({
      topicId: this.topicId,
      authorId: this.authorId,
      order: this.order,
      ...fields
    });
  }

  resetFilters() {
    this.authorId = 0;
    this.order = 0;
  }

  favorTopic(isFavorite) {
    this.setState({ isFavoring: true });
    api.favorTopic({
      action: isFavorite ? 'delfavorite' : 'favorite',
      id: this.topicId,
      idType: 'tid'
    }).then(response => {
      if (response.data.rs) {
        MessageBar.show({
          message: '操作成功',
          type: 'success'
        });
        this.resetFilters();
        this.fetchTopic();
      }
    }).finally(() => {
      this.setState({ isFavoring: false });
    });
  }

  endReached() {
    let {
      hasMore,
      isFetching,
      isEndReached,
      page
    } = this.props.topicItem;

    if (!hasMore || isFetching || isEndReached) { return; }

    this.fetchTopic({
      isEndReached: true,
      page: page + 1
    });
  }

  renderHeader() {
    let {
      navigation,
      vote,
      topicItem: {
        topic
      },
      user: {
        authrization: { uid }
      }
    } = this.props;
    let { isFavoring } = this.state;
    let create_date = moment(+topic.create_date).startOf('minute').fromNow();
    let commentHeaderText =
      topic.replies > 0 ? (topic.replies + '条评论') : '还没有评论，快来抢沙发！';

    return (
      <View>
        <View style={styles.top}>
          <Text style={styles.title}>{topic.title}</Text>
          <View style={styles.info}>
            <Icon
              style={styles.views}
              name='eye'>
              {topic.hits}
            </Icon>
            <Icon
              style={styles.comments}
              name='commenting'>
              {topic.replies}
            </Icon>
          </View>
        </View>
        <View style={styles.postContent}>
          <View style={styles.authorInfo}>
            <Avatar
              style={styles.avatar}
              url={topic.icon}
              userId={topic.user_id}
              currentUserId={uid}
              userName={topic.user_nick_name}
              navigation={navigation} />
            <View style={styles.author}>
              <View style={styles.row}>
                <Text style={styles.name}>{topic.user_nick_name}</Text>
                <Text style={styles.level}>{topic.userTitle}</Text>
              </View>
              <View style={[styles.row, styles.dateArea]}>
                <Text style={styles.date}>{create_date}</Text>
                {!!topic.mobileSign &&
                  <View style={[styles.row, styles.mobileWrapper]}>
                    <Icon style={styles.mobileIcon} name='mobile' />
                    <Text style={styles.mobileText}>{topic.mobileSign}</Text>
                  </View>
                }
              </View>
            </View>
            <View>
              <Text style={styles.floor}>楼主</Text>
              {uid && (
                isFavoring &&
                  <ActivityIndicator />
                  ||
                  <Icon
                    style={[styles.favor, topic.is_favor ? styles.fullFavor : styles.emptyFavor]}
                    size={22}
                    name={topic.is_favor ? 'star' : 'star-o'}
                    onPress={() => this.favorTopic(topic.is_favor)} />
              )}
            </View>
          </View>
          <View>
            <Content
              content={topic.content}
              navigation={navigation} />
            {topic.poll_info &&
              <VoteList
                pollInfo={topic.poll_info}
                publishVote={voteIds => this.publishVote(voteIds)} />
            }
          </View>
          {topic.reward &&
            <RewardList
              reward={topic.reward}
              currentUserId={uid}
              navigation={navigation} />}
        </View>
        <View style={styles.commentHeader}>
          <Text style={styles.commentHeaderText}>
            {commentHeaderText}
          </Text>
        </View>
      </View>
    );
  }

  renderFooter() {
    let {
      hasMore,
      isEndReached
    } = this.props.topicItem;

    if (!hasMore || !isEndReached) { return <View></View>; }

    return (
      <View style={indicatorStyles.endRechedIndicator}>
        <ActivityIndicator />
      </View>
    );
  }

  publishVote(voteIds) {
    this.setState({ isVoting: true });
    api.publishVote({
      topicId: this.topicId,
      voteIds
    }).then(response => {
      if (response.data.rs) {
        this.resetFilters();
        this.fetchTopic();
      }
    }).finally(() => {
      this.setState({ isVoting: false });
    });
  }

  resetVote() {
    this.props.resetVote();
  }

  getCopyContent(content) {
    if (!content || content.length === 0) { return ''; }
    // Only copy text and link.
    return content.map(item => {
      if (item.type === 0 || item.type === 4) {
        // The second parameter is used to exclude custom emoji
        // as copied content which type is also `0`.
        return parseContentWithEmoji(item.infor, false).join('');
      }
    }).join('');
  }

  showOperationDialog() {
    if (this.props.topicItem.isFetching) { return; }

    let options = [
      '返回首页',
      this.order === 0 ? '倒序查看' : '顺序查看',
      this.authorId === 0 ? '只看楼主' : '查看全部',
      '复制内容',
      '复制链接'
    ];
    let {
      user: {
        authrization: { uid }
      },
      topicItem: {
        topic: {
          user_id,
          managePanel
        }
      }
    } = this.props;
    let isLoginUser = uid === user_id;
    if (isLoginUser) {
      options.push('编辑帖子');
    }
    options.push('取消');

    ActionSheetIOS.showActionSheetWithOptions({
      options,
      cancelButtonIndex: options.length - 1
    },
    (buttonIndex) => {
      let { topic } = this.props.topicItem;
      switch (buttonIndex) {
        case 0:
          this.props.navigation.dispatch(resetAction);
          break;
        case 1:
          this.order = this.order === 0 ? 1 : 0;
          this.fetchTopic();
          break;
        case 2:
          this.authorId = this.authorId === 0 ? topic.user_id : 0;
          this.fetchTopic();
          break;
        case 3:
          Clipboard.setString(this.getCopyContent(topic.content));
          MessageBar.show({
            message: '复制内容成功',
            type: 'success'
          });
          break;
        case 4:
          Clipboard.setString(this.sourceWebUrl);
          MessageBar.show({
            message: '复制链接成功',
            type: 'success'
          });
          break;
        case 5:
          if (isLoginUser && managePanel && managePanel.length > 0) {
            let editAction = managePanel.find(item => item.title === '编辑');
            if (editAction) {
              Linking.openURL(editAction.action);
            }
          }
          break;
      }
    });
  }

  render() {
    let {
      topicItem,
      user: {
        authrization: { uid }
      },
      navigation
    } = this.props;

    if (topicItem.isFetching) {
      return (
        <View style={mainStyles.container}>
          <View style={indicatorStyles.fullScreenIndicator}>
            <ActivityIndicator />
          </View>
        </View>
      );
    }

    if (!_.get(topicItem, ['topic', 'topic_id'])) {
      return (
        <View style={mainStyles.container}>
        </View>
      );
    }

    let {
      topicItem: {
        topic: {
          user_nick_name,
          topic_id,
          replies
        }
      }
    } = this.props;

    return (
      <View style={mainStyles.container}>
        <FlatList
          data={topicItem.list}
          keyExtractor={(item, index) => index}
          removeClippedSubviews={false}
          enableEmptySections={true}
          renderItem={({ item: comment }) =>
            <Comment
              key={comment.reply_posts_id}
              comment={comment}
              currentUserId={uid}
              // `topicId` and `boardId` are not involved in `comment` here,
              // which are necessary for topic reply API.
              topicId={this.topicId}
              boardId={this.boardId}
              navigation={navigation}
              getCopyContent={(content) => this.getCopyContent(content)} />
          }
          onEndReached={() => this.endReached()}
          onEndReachedThreshold={0}
          ListHeaderComponent={() => this.renderHeader()}
          ListFooterComponent={() => this.renderFooter()} />
        {uid &&
          <TouchableHighlight
            style={styles.commentAreaWrapper}
            underlayColor={colors.underlay}
            onPress={() => navigation.navigate('ReplyModal', {
              comment: {
                // `reply_posts_id` is not necessary when reply topic author
                user_nick_name: user_nick_name,
                board_id: this.boardId,
                topic_id
              },
              isReplyInTopic: true
            })}>
            <View style={styles.commentArea}>
              <Text style={styles.commentAreaText}>发表评论 ({replies}条)</Text>
            </View>
          </TouchableHighlight>
        }
      </View>
    );
  }
}

function mapStateToProps(state, ownProps) {
  let { topicItem, user } = state;

  return {
    topicItem: _.get(topicItem, getTopicId(ownProps.navigation.state.params), {}),
    user
  };
}

export default connect(mapStateToProps, {
  fetchTopic,
  resetTopic
})(TopicDetail);
