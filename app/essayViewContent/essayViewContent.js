import React from 'react'
import '../style/components/content.less'
import '../style/essayViewContent/essayViewContent.less'
import Util from '../util/util'
import axios from 'axios'
import webserverRoute from '../webserverRoute'
import CommentContent from '../components/commentContent'
import qs from 'qs'
import $ from 'jquery'


let essayId = undefined;
let commentOffsetWidth = undefined;
let commentOffsetHeight = undefined;
let unloadComments = [];
//单个评论的最大宽度
const ONECOMMENTWIDTH = 175;
//一次取多少评论的量级
const COMMENTDEGREE = 3;
//观看文章范围在0到0.2部分添加用户评分数
const RANGEZEROTOTWO = 2;
//是否已经加过分
let Zero2TwoIsAppended = false;
//观看文章范围在0.2到0.6部分添加用户评分数
const RANGETWOTOSIX = 5;
//是否已经加过分
let Two2SixIsAppended = false;
//观看文章范围在0.6到1.0部分添加用户评分数
let Six2TenIsAppended = false;
const RANGESIXTOTEN = 10;
//定时添加评论的setInterval变量
let addCommentTimer = undefined;
let updataCommentTimer = undefined;
let startpos = 0;
let scrollTop = 0;
const ESSAYCLIENTHEIGHT = 623;

//根据时间进行评分标准
const twoTimeScore = 3;
const fourTimeScore = 5;
//保存当前观看时间
let currentTime = 0;

class EssayViewContent extends React.Component {

    constructor(props) {
        super(props);
        let that = this;
        // 获取路由中的essid参数
        let siteUrl = window.location.href;
        let parameterArr = Util.getGetUrlParameters(siteUrl, "essid");
        essayId = parameterArr["essid"];
        that.handleEssayScroll = that.handleEssayScroll.bind(that);
        that.handleaddComment = that.handleaddComment.bind(that);
        that.handleCollect = that.handleCollect.bind(that);
        that.state = {
            //文章内容
            essay: {},
            //保存已载入评论数组
            loadedComments: [],
            //是否已收藏此文章
            isCollect: false,
            //保存登陆状态
            loginState: false
        };
    }

    componentWillMount() {
        let that = this;
        axios.post(webserverRoute.isLogin).then(function(res){
            let data = res.data;
            if(data.loginState){
                that.setState({
                    loginState: true
                });
            }
        });
    }


    cleanOutComment(commentId){
        let loadedComments = this.state.loadedComments;
        let len = loadedComments.length;
        for(let i = 0;i<len;i++){
            if(loadedComments[i].commentId === commentId){
                loadedComments.splice(i,1);
                break;
            }
        }
        this.setState({
            loadedComments:loadedComments
        });
    }

    appendTimeScore(){
        currentTime = currentTime+1;
        if(currentMinute===2){
            addEssayAction(twoTimeScore);
        }else if(currentMinute === 4){
            addEssayAction(fourTimeScore);
        }
    }
    componentDidMount() {
        let that = this;
        that.timerID = setInterval(
            () => that.appendTimeScore(),
            30000
        );
        //异步请求文章内容
        axios.post(webserverRoute.viewEssay, {
            essid: essayId
        }).then(function (res) {
            console.log(res);
            that.setState({
                essay: res.data,
                isCollect: res.data.isCollect !== 0
            });
        }).catch(function (err) {
            // TODO 错误处理
            console.log(err);
        });
        //获取评论容器的高和宽
        let commentBox = that.refs.commentBox;
        commentOffsetWidth = commentBox.offsetWidth;
        commentOffsetHeight = commentBox.offsetHeight;
        //载入第一批评论
        that.loadComments(scrollTop,startpos);
    }

    //载入评论至未载入列表
    loadComments(pos,startpos){
        let that = this;
        //TODO 需要适应屏幕动态改变宽度
        let pagecount = Math.floor(commentOffsetWidth / ONECOMMENTWIDTH * COMMENTDEGREE);
        //异步获取评论列表
        axios.post(webserverRoute.getComment,qs.stringify({
            essayid: essayId,
            pos: pos,
            startpos: startpos*pagecount,
            pagecount: pagecount
        })).then(function(res){
            let comments = res.data.comments;
            let commentLen = 0;
            let flag = true;
            if(comments !== null){
                commentLen = comments.length;
            }else{
                flag = false;
            }
            //检查当前容器里是否有一样的评论,一样则不显示
            for(let i=0;i<commentLen;i++){
                let newCommentId=comments[i].commentId;
                let loadedComments = that.state.loadedComments;
                let loadedCommentLen = loadedComments.length;
                for(let j = 0;j<loadedCommentLen;j++){
                    if(loadedComments[j].commentId === newCommentId){
                        flag = false;
                        break;
                    }
                }
                let unloadCommentLen = unloadComments.length;
                for(let j = 0;j<unloadCommentLen;j++){
                    if(unloadComments[j].commentId === newCommentId){
                        flag = false;
                        break;
                    }
                }
                if(flag === false){
                    break;
                }
            }
            if(flag){
                unloadComments = unloadComments.concat(comments);
                if(addCommentTimer !== undefined){
                    clearInterval(addCommentTimer);
                }
                addCommentTimer = setInterval(that.runComment.bind(that),1000);
            }
            if(unloadComments.length === 0){
                clearInterval(addCommentTimer);
            }
        }).catch(function(err){
            //TODO 错误处理
            console.log(err)
        });
    }

    //将未载入列表中的评论部分转入显示列表并开始动画的函数，将放入定时器中定时执行
    runComment(){
        // console.log(unloadComments);
        var that = this;
        //当前没有未载入评论
        if(unloadComments.length === 0){
            startpos++;
            //再去服务器拉取评论
            that.loadComments(scrollTop,startpos);
            return;
        }
        let tempComments = that.state.loadedComments;
        let onePageCount = Math.floor(commentOffsetWidth / ONECOMMENTWIDTH);
        let commentLength = unloadComments.length;
        //判断当前未载入评论是否多余单次载入量
        if(commentLength>onePageCount){
            for(let i=0;i<onePageCount;i++){
                //随机生成出发位置
                let ramdomLeft = Util.getRandomNum(0,commentOffsetWidth-ONECOMMENTWIDTH);
                let comment = unloadComments.shift();
                comment.ramdomLeft = ramdomLeft;
                comment.commentDate=Util.dateFtt("yyyy-MM-dd hh:mm:ss",new Date(comment.commentDate));
                tempComments.push(comment);
            }
        }else{
            for(let i=0;i<commentLength;i++){
                let ramdomLeft = Util.getRandomNum(0,commentOffsetWidth-ONECOMMENTWIDTH);
                unloadComments[i].ramdomLeft = ramdomLeft;
                unloadComments[i].commentDate=Util.dateFtt("yyyy-MM-dd hh:mm:ss",new Date(unloadComments[i].commentDate));
            }
            tempComments = tempComments.concat(unloadComments);
            unloadComments = [];
        }
        that.setState({
            loadedComments:tempComments
        });
    }

    addEssayAction(score){
        var that = this;
        let scoreData = {
            essayId:that.state.essay.essayId,
            score:score
        };
        axios.post(webserverRoute.appendAction,
            qs.stringify(scoreData)).then(function(res){
                console.log(res);
        }).catch(function(err){
            //TODO 错误处理
            console.log(err);
        });
    }

    //绑定文章滑动事件
    handleEssayScroll(e){
        var that = this;
        e.preventDefault();
        e.stopPropagation();
        let essayScrollTop = e.nativeEvent.target.scrollTop;
        //计算用户观看文章百分比
        let watchPrecent = essayScrollTop/(that.refs.essayBox.scrollHeight-ESSAYCLIENTHEIGHT);
        console.log(watchPrecent);
        if(watchPrecent>=0&&watchPrecent<0.2&&Zero2TwoIsAppended === false){
            that.addEssayAction(RANGEZEROTOTWO);
            Zero2TwoIsAppended = true;
            Two2SixIsAppended = false;
            Six2TenIsAppended = false;
        }else if(watchPrecent>=0.2&&watchPrecent<0.6&&Two2SixIsAppended === false){
            that.addEssayAction(RANGETWOTOSIX);
            Two2SixIsAppended = true;
            Six2TenIsAppended = false;
            Zero2TwoIsAppended = false;
        }else if(watchPrecent>=0.6&&watchPrecent<1.0&&Six2TenIsAppended === false){
            that.addEssayAction(RANGESIXTOTEN);
            Six2TenIsAppended = true;
            Two2SixIsAppended = false;
            Zero2TwoIsAppended = false;
        }
        // console.log(scrollHeight);
        let tempScrollTop = Math.floor(essayScrollTop);
        if(Math.abs(tempScrollTop - scrollTop)>50){
            // console.log(tempScrollTop);
            if(updataCommentTimer !== undefined){
                clearTimeout(updataCommentTimer);
            }
            updataCommentTimer = setTimeout(function(){
                startpos = 0;
                scrollTop = tempScrollTop;
                that.loadComments(scrollTop,startpos);
            },1000);
        }
    }

    //绑定添加评论事件
    handleaddComment(e){
        e.preventDefault();
        e.stopPropagation();
        var that = this;
        //防止未登录评论
        if(!that.state.loginState){
            return;
        }
        let formData = new FormData($("#comment-add-form")[0]);
        let commentContent =formData.get("comment-content").trim();
        if(commentContent === ""){
            console.log("评论不能为空");
            return;
        }
        let commentData= {
            essayId: that.state.essay.essayId,
            sendPos: scrollTop,
            commentContent:commentContent
        };
        axios.post(webserverRoute.addComment,
            qs.stringify(commentData)).then(function(res){
            that.loadComments(scrollTop,startpos);
        }).catch(function(err){
            //TODO 错误处理
            console.log(err);
        });
    }

    //绑定收藏事件
    handleCollect(){
        var that = this;
        //防止未登录收藏
        if(!that.state.loginState){
            return;
        }
        //取消收藏
        if(that.state.isCollect){
            axios.post(webserverRoute.cancelCollectEssay,qs.stringify({
                essayId: that.state.essay.essayId
            })).then(function(res){
                that.setState({
                    isCollect:false
                })
            }).catch(function(err){
                //TODO 错误处理
                console.log(err)
            });
        }else{
            axios.post(webserverRoute.collectEssay,qs.stringify({
                essayId: that.state.essay.essayId
            })).then(function(res){
                that.setState({
                    isCollect: true
                });
            }).catch(function(err){
                //TODO 错误处理
                console.log(err)
            });
        }
    }

    componentWillUnmount() {
        clearInterval(this.timerID);
    }

    render() {
        return (
            <div id="con">
                <div id="essay-box" className="fl" onScroll={this.handleEssayScroll} ref="essayBox">
                    <h1 id="essay-title" className="ml10">{this.state.essay.essayTitle}</h1>
                    <img src={this.state.isCollect?"/static/img/essayview/collected.png":"/static/img/essayview/collect.png"} alt="收藏" className="collectIcon"
                         onClick={this.handleCollect}/>
                    <span id="essay-author" className="ml20">{this.state.essay.authorName}</span>
                    <span id="essay-date" className="ml20">{this.state.essay.essayDate}</span>
                    <div id="essay-content" dangerouslySetInnerHTML={{__html: this.state.essay.essayContent}} ref="essayContent"/>
                </div>
                <div id="comment-box" className="fr" ref="commentBox">
                    {
                        this.state.loadedComments.map(function(comment){
                            return (<CommentContent key={comment.commentId} commentId={comment.commentId} commentPeople={comment.authorName}
                                                    commentContent={comment.commentContent} commentDate={comment.commentDate} supportNum={comment.supportNum} UpNum={comment.thumbsUp}
                                                    commentLeft={comment.ramdomLeft} commentHeight={commentOffsetHeight}
                                                    cleanOutComment={this.cleanOutComment.bind(this)}/>);
                        }.bind(this))
                    }
                    <div id="add-comment">
                        <form id="comment-add-form">
                            <textarea name="comment-content" id="comment-content" cols="30" rows="10"/>
                            <button onClick={this.handleaddComment}>评论</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}

export default EssayViewContent;