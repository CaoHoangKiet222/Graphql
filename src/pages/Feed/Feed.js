import React, { Component, Fragment } from "react";

import Post from "../../components/Feed/Post/Post";
import Button from "../../components/Button/Button";
import FeedEdit from "../../components/Feed/FeedEdit/FeedEdit";
import Input from "../../components/Form/Input/Input";
import Paginator from "../../components/Paginator/Paginator";
import Loader from "../../components/Loader/Loader";
import ErrorHandler from "../../components/ErrorHandler/ErrorHandler";
import "./Feed.css";

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: "",
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    const graphqlQuery = {
      query: `
        query {
          getUser {
            status
          }
        }
      `
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.data.getUser.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === "next") {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === "previous") {
      page--;
      this.setState({ postPage: page });
    }

    const graphqlQuery = {
      query: `
        query {
          getPosts(page: ${page}) {
            posts {
                _id
                title
                imageUrl
                createdAt
                creator {
                    name
                }
                updatedAt
            }
            totalPosts
          }
        }
      `
    };

    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.data.getPosts.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            };
          }),
          totalPosts: resData.data.getPosts.totalPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const graphqlQuery = {
      query: `
        mutation {
          updateStatus(newStatus: "${this.state.status}") {
            status
          }
        }
      `
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error("Update status failed!!");
        }
        this.setState({ status: resData.data.updateStatus.status });
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    this.setState({
      editLoading: true
    });
    const formData = new FormData();
    formData.append("image", postData.image);
    let isEdit = false;

    if (this.state.editPost) {
      isEdit = true;
      formData.append("oldPath", this.state.editPost.imagePath);
    }

    fetch("http://localhost:8080/post-image", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + this.props.token
      },
      body: formData
    })
      .then(res => {
        return res.json();
      })
      .then(data => {
        if (!data.filePath) {
          return this.setState({
            isEditing: false,
            editPost: null,
            editLoading: false,
            error: data
          });
        }

        const graphqlQuery = {
          query: `
            mutation($input: PostInputData!) {
              ${!isEdit ? "createPost" : "updatePost"}(postInput: $input)  {
                _id
                title
                imageUrl
                content
                creator {
                  name
                }
                createdAt
              }
            }
          `,
          variables: {
            input: {
              _id: !isEdit ? "" : this.state.editPost._id,
              title: postData.title,
              content: postData.content,
              imageUrl: data.filePath
            }
          }
        };

        fetch("http://localhost:8080/graphql", {
          method: "POST",
          body: JSON.stringify(graphqlQuery),
          headers: {
            Authorization: "Bearer " + this.props.token,
            "Content-Type": "application/json"
          }
        })
          .then(res => {
            return res.json();
          })
          .then(resData => {
            const post = {
              _id: resData.data[!isEdit ? "createPost" : "updatePost"]._id,
              title: resData.data[!isEdit ? "createPost" : "updatePost"].title,
              content:
                resData.data[!isEdit ? "createPost" : "updatePost"].content,
              creator:
                resData.data[!isEdit ? "createPost" : "updatePost"].creator,
              createdAt:
                resData.data[!isEdit ? "createPost" : "updatePost"].createdAt,
              imagePath:
                resData.data[!isEdit ? "createPost" : "updatePost"].imageUrl
            };
            this.setState(prevState => {
              if (!isEdit) {
                prevState.posts.length === 3 && prevState.posts.pop();
              } else {
                prevState.posts.splice(
                  prevState.posts.findIndex(p => {
                    return p._id === post._id;
                  }),
                  1,
                  post
                );
              }
              return {
                posts: !isEdit
                  ? [post, ...prevState.posts]
                  : [...prevState.posts],
                postPage: 1,
                isEditing: false,
                editPost: null,
                editLoading: false
              };
            });
          })
          .catch(err => {
            console.log(err);
            this.setState({
              isEditing: false,
              editPost: null,
              editLoading: false,
              error: err
            });
          });
      });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphqlQuery = {
      query: `
        mutation {
          deletePost(postId: "${postId}")
        }
      `
    };
    fetch("http://localhost:8080/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.props.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          throw new Error("Deleting post failed!!");
        }
        this.loadPosts();
      })
      .catch(err => {
        console.log(err);
        this.setState({
          isEditing: false,
          editPost: null,
          editLoading: false,
          postsLoading: false,
          error: err
        });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: "center" }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, "previous")}
              onNext={this.loadPosts.bind(this, "next")}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString("en-US")}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
